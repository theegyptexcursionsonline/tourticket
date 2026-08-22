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
import { storedTenantId, tenantSlugFilter } from "@/lib/tenant/tenantScope";
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
  if (!payload.title || payload.title.length < 5) return "title must be >= 5 chars";
  if (!payload.slug) return "slug is required";
  if (!/^[a-z0-9-]+$/.test(payload.slug)) {
    return "slug must contain only lowercase letters, numbers, and hyphens";
  }
  if (!payload.excerpt || payload.excerpt.length < 10) return "excerpt must be >= 10 chars";
  if (!payload.content || payload.content.length < 100) return "content must be >= 100 chars";
  if (!payload.category || !BLOG_CATEGORIES.has(payload.category)) {
    return `category must be one of: ${[...BLOG_CATEGORIES].join(", ")}`;
  }
  return null;
}

async function POSTHandler(req: NextRequest) {
  const authError = verifyContentEngine(req);
  if (authError) return authError;

  let body: IncomingBody;
  try {
    body = (await req.json()) as IncomingBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
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

  await dbConnect();

  // Claim the key before writing anything; a replayed key returns the original
  // response instead of publishing the post a second time.
  let claim: PublishClaim | null = null;
  if (idempotencyKey) {
    const begun = await beginPublish({
      idempotencyKey,
      tenantId: body.tenantId,
      contentType: "blog",
      requestHash: hashPublishRequest(body),
    });
    if (begun.outcome === "replay") {
      return NextResponse.json(begun.body, { status: begun.status });
    }
    if (begun.outcome === "error") {
      return NextResponse.json({ error: begun.error }, { status: begun.status });
    }
    claim = begun;
  }

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

  // Slugs are namespaced per tenant — the same slug may exist on another tenant.
  const existing = await Blog.findOne(tenantSlugFilter(payload.slug!, body.tenantId));
  if (existing) {
    // A resumed claim means a previous attempt for THIS key died mid-publish,
    // so a record under the same slug is that attempt's own work — adopt it
    // rather than reporting a duplicate the engine never created twice.
    if (claim?.resumed) {
      const adopted = {
        id: String(existing._id),
        slug: existing.slug,
        liveUrl: liveUrlForBlog(existing.slug, base.baseLocale),
        droppedLocales,
      };
      await completePublish(claim, 201, adopted);
      return NextResponse.json(adopted, { status: 201 });
    }
    if (claim) await releasePublishClaim(claim);
    return NextResponse.json(
      { error: `A blog post with slug "${payload.slug}" already exists`, existingId: String(existing._id) },
      { status: 409 },
    );
  }

  let contentCommitted = false;
  try {
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
      status: payload.status === "draft" ? "draft" : "published",
      featured: payload.featured === true,
      tenantId: storedTenantId(body.tenantId),
      translations,
    });
    contentCommitted = true;

    const created = {
      id: String(doc._id),
      slug: doc.slug,
      liveUrl: liveUrlForBlog(doc.slug, base.baseLocale),
      droppedLocales,
    };

    // Mark processed only now that the post is committed — an attempt that dies
    // before this point leaves a stale claim the next retry can take over.
    if (claim) await completePublish(claim, 201, created);

    revalidateStorefrontContent();

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    // Once the content document exists, retain the pending receipt. A retry
    // can reclaim it after the lease and adopt the already-written document.
    // Deleting that receipt here would turn response-loss into a false 409.
    if (claim && !contentCommitted) await releasePublishClaim(claim);
    const message = err instanceof Error ? err.message : "Insert failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function PUTHandler(req: NextRequest) {
  const authError = verifyContentEngine(req);
  if (authError) return authError;

  let body: IncomingBody;
  try {
    body = (await req.json()) as IncomingBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const tenant = verifyContentEngineTenant(body.tenantId);
  if (!tenant.ok) return tenant.response;
  body.tenantId = tenant.tenantId;

  const error = validate(body.payload);
  if (error) return NextResponse.json({ error }, { status: 400 });
  const payload = body.payload!;

  const base = resolveBaseLocale(body.defaultLocale);
  if (!base.ok) return NextResponse.json({ error: base.error }, { status: 400 });

  await dbConnect();

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

  try {
    await existing.save();
    revalidateStorefrontContent();
    return NextResponse.json({
      id: String(existing._id),
      slug: existing.slug,
      liveUrl: liveUrlForBlog(existing.slug, base.baseLocale),
      droppedLocales,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = withAdminAudit(POSTHandler);
export const PUT = withAdminAudit(PUTHandler);
