// app/api/admin/content/blog/route.ts
// Adapter route for the foxes-content-engine.
// Auth: Bearer token in Authorization header (CONTENT_ENGINE_API_KEY).
// POST creates a new blog post; PUT updates an existing one by slug.

import { withAdminAudit } from '@/lib/admin/adminAudit';
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Blog from "@/lib/models/Blog";
import {
  verifyContentEngine,
  verifyContentEngineTenant,
} from "@/lib/auth/verifyContentEngine";
import { tenantSlugFilter } from "@/lib/tenant/tenantScope";
import {
  filterSupportedTranslations,
  resolveBaseLocale,
  withBaseLocaleBucket,
} from "@/lib/i18n/supportedTranslations";
import { defaultLocale } from "@/i18n/config";
import {
  beginPublish,
  completePublish,
  hashPublishRequest,
  readIdempotencyKey,
  releasePublishClaim,
  type PublishClaim,
} from "@/lib/content/publishIdempotency";
import { revalidateStorefrontContent } from "@/lib/storefront/revalidateTourStorefront";
import {
  contentReceiverIndexesReady,
  type ReceiverIndexDatabase,
} from "@/lib/content/receiverIndexReadiness";
import {
  isBoundedString,
  isBoundedStringArray,
  isPlainRecord,
  isSafeHttpsUrl,
  isTranslationEnvelope,
} from "@/lib/content/receiverPayloadValidation";

const BLOG_CATEGORIES = new Set([
  "travel-tips",
  "destination-guides",
  "food-culture",
  "adventure",
  "budget-travel",
  "luxury-travel",
  "solo-travel",
  "family-travel",
  "photography",
  "local-insights",
  "seasonal-travel",
  "transportation",
  "accommodation",
  "news-updates",
]);

type IncomingPayload = {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  category?: string;
  tags?: unknown;
  metaTitle?: string;
  metaDescription?: string;
  author?: string;
  authorAvatar?: string;
  authorBio?: string;
  featuredImage?: string;
  readTime?: number;
  status?: string;
  featured?: boolean;
  faqs?: unknown;
};

// Keep only well-formed { question, answer } pairs from the engine payload.
function sanitizeFaqs(input: unknown): { question: string; answer: string }[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((f) => {
      const o = (f ?? {}) as { question?: unknown; answer?: unknown };
      return {
        question: typeof o.question === "string" ? o.question.trim() : "",
        answer: typeof o.answer === "string" ? o.answer.trim() : "",
      };
    })
    .filter((f) => f.question.length > 0 && f.answer.length > 0)
    .slice(0, 10);
}

type IncomingBody = {
  tenantId?: string;
  // Language the base `payload` is written in; defaults to this site's default.
  defaultLocale?: string;
  payload?: IncomingPayload;
  translations?: Record<string, Record<string, unknown>>;
};

// The localized fields a reader can overlay, mirrored from the base payload
// when the engine wrote it in a non-default language.
function baseLocaleBucket(payload: IncomingPayload): Record<string, unknown> {
  return {
    title: payload.title,
    excerpt: payload.excerpt,
    content: payload.content,
    metaTitle: payload.metaTitle,
    metaDescription: payload.metaDescription,
  };
}

function liveUrlForBlog(slug: string, locale: string = defaultLocale): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://www.egypt-excursionsonline.com";
  const prefix = locale === defaultLocale ? "" : `/${locale}`;
  return `${base}${prefix}/blog/${slug}`;
}

function validate(payload: IncomingPayload | undefined): string | null {
  if (!payload) return "payload is required";
  if (!isBoundedString(payload.title, 5, 200)) {
    return "title must be a string between 5 and 200 chars";
  }
  if (typeof payload.slug !== "string" || payload.slug.length > 80 || !/^[a-z0-9-]+$/.test(payload.slug)) {
    return "slug must contain only lowercase letters, numbers, and hyphens";
  }
  if (!isBoundedString(payload.excerpt, 10, 300)) {
    return "excerpt must be a string between 10 and 300 chars";
  }
  if (!isBoundedString(payload.content, 100, 250_000)) {
    return "content must be a string between 100 and 250000 chars";
  }
  if (typeof payload.category !== "string" || !BLOG_CATEGORIES.has(payload.category)) {
    return `category must be one of: ${[...BLOG_CATEGORIES].join(", ")}`;
  }
  if (!isBoundedStringArray(payload.tags, 3, 10, 1, 50)) {
    return "tags must contain 3 to 10 strings of at most 50 chars";
  }
  if (!isBoundedString(payload.metaTitle, 5, 60)) return "metaTitle must be between 5 and 60 chars";
  if (!isBoundedString(payload.metaDescription, 20, 160)) {
    return "metaDescription must be between 20 and 160 chars";
  }
  if (!isBoundedString(payload.author, 2, 100)) return "author must be between 2 and 100 chars";
  if (!isSafeHttpsUrl(payload.featuredImage)) return "featuredImage must use the approved EEO HTTPS image host";
  if (!Number.isInteger(payload.readTime) || payload.readTime! < 1 || payload.readTime! > 60) {
    return "readTime must be an integer between 1 and 60";
  }
  if (payload.status !== "published") return 'status must be "published"';
  if (typeof payload.featured !== "boolean") return "featured must be a boolean";
  return null;
}

async function POSTHandler(req: NextRequest) {
  const authError = verifyContentEngine(req);
  if (authError) return authError;

  let body: IncomingBody;
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "JSON body must be an object" }, { status: 400 });
    }
    body = parsed as IncomingBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isPlainRecord(body.payload)) {
    return NextResponse.json({ error: "payload must be an object" }, { status: 400 });
  }
  if (!isTranslationEnvelope(body.translations)) {
    return NextResponse.json({ error: "translations must be an object map" }, { status: 400 });
  }

  const tenant = verifyContentEngineTenant(body.tenantId);
  if (!tenant.ok) return tenant.response;
  body.tenantId = tenant.tenantId;

  const error = validate(body.payload);
  if (error) return NextResponse.json({ error }, { status: 400 });
  const payload = body.payload!;

  const base = resolveBaseLocale(body.defaultLocale);
  if (!base.ok) return NextResponse.json({ error: base.error }, { status: 400 });

  const { key: idempotencyKey, error: keyError } = readIdempotencyKey(
    req.headers.get("idempotency-key"),
  );
  if (keyError) return NextResponse.json({ error: keyError }, { status: 400 });

  let connection: Awaited<ReturnType<typeof dbConnect>>;
  try {
    connection = await dbConnect();
  } catch (error) {
    console.error("[content-receiver] database connection failed", {
      contentType: "blog",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "Content publish is temporarily unavailable" },
      { status: 503 },
    );
  }
  if (!(await contentReceiverIndexesReady(
    "blog",
    connection.connection.db as unknown as ReceiverIndexDatabase,
  ))) {
    return NextResponse.json(
      { error: "Content receiver indexes are not ready" },
      { status: 503 },
    );
  }

  // Claim the key before writing anything; a replayed key returns the original
  // response instead of publishing the post a second time.
  if (!idempotencyKey) {
    return NextResponse.json({ error: "Idempotency-Key header is required" }, { status: 400 });
  }
  let begun: Awaited<ReturnType<typeof beginPublish>>;
  try {
    begun = await beginPublish({
      idempotencyKey,
      tenantId: body.tenantId,
      contentType: "blog",
      requestHash: hashPublishRequest(body),
    });
  } catch (error) {
    console.error("[content-receiver] receipt claim failed", {
      contentType: "blog",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Content publish is temporarily unavailable" }, { status: 503 });
  }
  if (begun.outcome === "replay") {
    return NextResponse.json(begun.body, { status: begun.status });
  }
  if (begun.outcome === "error") {
    return NextResponse.json({ error: begun.error }, { status: begun.status });
  }
  const claim: PublishClaim = begun;

  const tags = Array.isArray(payload.tags)
    ? payload.tags
        .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
        .slice(0, 10)
    : [];

  const filtered = filterSupportedTranslations(body.translations);
  const droppedLocales = filtered.droppedLocales;
  const translations = withBaseLocaleBucket(
    filtered.translations,
    base.baseLocale,
    baseLocaleBucket(payload),
  );

  let contentCommitted = false;
  try {
    // Slugs are namespaced per tenant — the same slug may exist on another tenant.
    const existing = await Blog.findOne(tenantSlugFilter(payload.slug!, body.tenantId));
    if (existing) {
      // Recover only a record carrying this exact durable receipt. A stale claim
      // must never adopt unrelated/manual content that took the same slug.
      const recovered = claim.resumed
        ? await Blog.findOne({
            ...tenantSlugFilter(payload.slug!, body.tenantId),
            contentEnginePublishReceiptId: claim.receiptId,
          })
        : null;
      if (recovered) {
        contentCommitted = true;
        const adopted = {
          id: String(recovered._id),
          slug: recovered.slug,
          liveUrl: liveUrlForBlog(recovered.slug, base.baseLocale),
          droppedLocales,
        };
        revalidateStorefrontContent();
        await completePublish(claim, 201, adopted);
        return NextResponse.json(adopted, { status: 201 });
      }
      await releasePublishClaim(claim);
      return NextResponse.json(
        { error: `A blog post with slug "${payload.slug}" already exists`, existingId: String(existing._id) },
        { status: 409 },
      );
    }

    const doc = await Blog.create({
      title: payload.title,
      slug: payload.slug,
      excerpt: payload.excerpt,
      content: payload.content,
      category: payload.category,
      tags,
      faqs: sanitizeFaqs(payload.faqs),
      author: payload.author?.trim() || "EEO Editorial Team",
      authorAvatar: payload.authorAvatar,
      authorBio: payload.authorBio,
      featuredImage:
        payload.featuredImage ??
        "https://res.cloudinary.com/dm3sxllch/image/upload/v1781977478/foxes-content-engine/heroes/loxyoywr6qhln7dnpaig.jpg",
      metaTitle: payload.metaTitle,
      metaDescription: payload.metaDescription,
      readTime: payload.readTime,
      status: "published",
      featured: payload.featured === true,
      tenantId: tenant.tenantId,
      contentEnginePublishReceiptId: claim.receiptId,
      translations,
    });
    contentCommitted = true;

    const created = {
      id: String(doc._id),
      slug: doc.slug,
      liveUrl: liveUrlForBlog(doc.slug, base.baseLocale),
      droppedLocales,
    };

    revalidateStorefrontContent();

    // Mark processed only after the post and cache invalidation succeed. A
    // retry can safely repeat invalidation after response loss.
    await completePublish(claim, 201, created);

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    // Once the content document exists, retain the pending receipt. A retry
    // can reclaim it after the lease and adopt the already-written document.
    // Deleting that receipt here would turn response-loss into a false 409.
    if (!contentCommitted) {
      try {
        await releasePublishClaim(claim);
      } catch (releaseError) {
        console.error("[content-receiver] receipt release failed", {
          contentType: "blog",
          errorName: releaseError instanceof Error ? releaseError.name : "UnknownError",
        });
      }
    }
    const duplicate =
      Boolean(err) && typeof err === "object" && (err as { code?: number }).code === 11000;
    if (duplicate) {
      return NextResponse.json({ error: "A blog post with this identity already exists" }, { status: 409 });
    }
    console.error("[content-receiver] publish failed", {
      contentType: "blog",
      stage: contentCommitted ? "receipt-completion" : "content-write",
      errorName: err instanceof Error ? err.name : "UnknownError",
    });
    return NextResponse.json({ error: "Content publish failed; retry shortly" }, { status: 503 });
  }
}

async function PUTHandler(req: NextRequest) {
  const authError = verifyContentEngine(req);
  if (authError) return authError;

  let body: IncomingBody;
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "JSON body must be an object" }, { status: 400 });
    }
    body = parsed as IncomingBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isPlainRecord(body.payload)) {
    return NextResponse.json({ error: "payload must be an object" }, { status: 400 });
  }
  if (!isTranslationEnvelope(body.translations)) {
    return NextResponse.json({ error: "translations must be an object map" }, { status: 400 });
  }

  const tenant = verifyContentEngineTenant(body.tenantId);
  if (!tenant.ok) return tenant.response;
  body.tenantId = tenant.tenantId;

  const error = validate(body.payload);
  if (error) return NextResponse.json({ error }, { status: 400 });
  const payload = body.payload!;

  const base = resolveBaseLocale(body.defaultLocale);
  if (!base.ok) return NextResponse.json({ error: base.error }, { status: 400 });

  let connection: Awaited<ReturnType<typeof dbConnect>>;
  try {
    connection = await dbConnect();
  } catch (error) {
    console.error("[content-receiver] database connection failed", {
      contentType: "blog-update",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Content update is temporarily unavailable" }, { status: 503 });
  }
  if (!(await contentReceiverIndexesReady(
    "blog",
    connection.connection.db as unknown as ReceiverIndexDatabase,
  ))) {
    return NextResponse.json({ error: "Content receiver indexes are not ready" }, { status: 503 });
  }

  try {
    const existing = await Blog.findOne(tenantSlugFilter(payload.slug!, body.tenantId));
    if (!existing) {
      return NextResponse.json(
        { error: `No blog post with slug "${payload.slug}"` },
        { status: 404 },
      );
    }

    const tags = Array.isArray(payload.tags)
      ? payload.tags
          .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
          .slice(0, 10)
      : existing.tags;

    existing.title = payload.title!;
    existing.excerpt = payload.excerpt!;
    existing.content = payload.content!;
    existing.category = payload.category!;
    existing.tags = tags;
    if (Array.isArray(payload.faqs)) existing.faqs = sanitizeFaqs(payload.faqs);
    if (payload.metaTitle) existing.metaTitle = payload.metaTitle;
    if (payload.metaDescription) existing.metaDescription = payload.metaDescription;
    if (payload.featuredImage) existing.featuredImage = payload.featuredImage;
    if (payload.author) existing.author = payload.author;
    if (typeof payload.featured === "boolean") existing.featured = payload.featured;
    let droppedLocales: string[] = [];
    if (body.translations) {
      const filtered = filterSupportedTranslations(body.translations);
      droppedLocales = filtered.droppedLocales;
      existing.translations = withBaseLocaleBucket(
        filtered.translations,
        base.baseLocale,
        baseLocaleBucket(payload),
      ) as typeof existing.translations;
    }

    await existing.save();
    revalidateStorefrontContent();
    return NextResponse.json({
      id: String(existing._id),
      slug: existing.slug,
      liveUrl: liveUrlForBlog(existing.slug, base.baseLocale),
      droppedLocales,
    });
  } catch (err) {
    const duplicate =
      Boolean(err) && typeof err === "object" && (err as { code?: number }).code === 11000;
    if (duplicate) {
      return NextResponse.json({ error: "A blog post with this identity already exists" }, { status: 409 });
    }
    console.error("[content-receiver] update failed", {
      contentType: "blog",
      errorName: err instanceof Error ? err.name : "UnknownError",
    });
    return NextResponse.json({ error: "Content update failed; retry shortly" }, { status: 503 });
  }
}

export const POST = withAdminAudit(POSTHandler);
export const PUT = withAdminAudit(PUTHandler);
