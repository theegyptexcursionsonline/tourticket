// app/api/admin/content/category/route.ts
// Adapter route for the foxes-content-engine — category / landing page type.
// Auth: Bearer token in Authorization header (CONTENT_ENGINE_API_KEY).
// POST creates a new category; PUT updates an existing one by slug.
// Reuses the existing Category model + the /{locale}/categories/{slug} page.

import { withAdminAudit } from '@/lib/admin/adminAudit';
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Category from "@/lib/models/Category";
import {
  verifyContentEngine,
  verifyContentEngineTenant,
} from "@/lib/auth/verifyContentEngine";
import { tenantFilter, tenantSlugFilter } from "@/lib/tenant/tenantScope";
import {
  filterSupportedTranslations,
  resolveBaseLocale,
  withBaseLocaleBucket,
} from "@/lib/i18n/supportedTranslations";
import {
  beginPublish,
  completePublish,
  hashPublishRequest,
  readIdempotencyKey,
  releasePublishClaim,
  type PublishClaim,
} from "@/lib/content/publishIdempotency";
import { localizedContentPath } from "@/lib/content/contentUrl";
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

type IncomingPayload = {
  name?: string;
  slug?: string;
  description?: string;
  longDescription?: string;
  highlights?: unknown;
  features?: unknown;
  keywords?: unknown;
  tags?: unknown;
  metaTitle?: string;
  metaDescription?: string;
  heroImage?: string;
  featuredImage?: string;
  published?: boolean;
  featured?: boolean;
};

type IncomingBody = {
  tenantId?: string;
  defaultLocale?: string;
  payload?: IncomingPayload;
  translations?: Record<string, Record<string, unknown>>;
};

function baseLocaleBucket(p: IncomingPayload): Record<string, unknown> {
  return {
    name: p.name,
    description: p.description,
    longDescription: p.longDescription,
    highlights: p.highlights,
    features: p.features,
    keywords: p.keywords ?? p.tags,
    metaTitle: p.metaTitle,
    metaDescription: p.metaDescription,
  };
}

function liveUrlFor(slug: string, locale: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://www.egypt-excursionsonline.com";
  return `${base}${localizedContentPath("category", slug, "default", locale)}`;
}

function validate(p: IncomingPayload | undefined): string | null {
  if (!p) return "payload is required";
  if (!isBoundedString(p.name, 2, 100)) {
    return "name must be a string between 2 and 100 chars";
  }
  if (typeof p.slug !== "string" || p.slug.length > 80 || !/^[a-z0-9-]+$/.test(p.slug)) {
    return "slug must contain only lowercase letters, numbers, and hyphens";
  }
  if (!isBoundedString(p.description, 40, 500)) {
    return "description must be a string between 40 and 500 chars";
  }
  if (!isBoundedString(p.longDescription, 200, 2_000)) return "longDescription must be between 200 and 2000 chars";
  if (!isBoundedStringArray(p.highlights, 4, 8, 5, 200)) return "highlights must contain 4 to 8 complete items";
  if (!isBoundedStringArray(p.features, 3, 6, 10, 300)) return "features must contain 3 to 6 complete items";
  if (!isBoundedStringArray(p.keywords, 3, 10, 1, 50)) return "keywords must contain 3 to 10 complete items";
  if (!isBoundedString(p.metaTitle, 5, 60)) return "metaTitle must be between 5 and 60 chars";
  if (!isBoundedString(p.metaDescription, 20, 160)) return "metaDescription must be between 20 and 160 chars";
  if (!isSafeHttpsUrl(heroFrom(p))) return "featuredImage must use the approved EEO HTTPS image host";
  if (p.published !== true) return "published must be true";
  if (typeof p.featured !== "boolean") return "featured must be a boolean";
  return null;
}

function asStringArray(v: unknown, max = 12): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .slice(0, max);
}

// The engine sends the hero as `featuredImage` (its canonical image field);
// the Category model stores it as `heroImage`.
function heroFrom(p: IncomingPayload): string | undefined {
  return p.heroImage || p.featuredImage || undefined;
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
  const p = body.payload!;

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
      contentType: "category",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "Content publish is temporarily unavailable" },
      { status: 503 },
    );
  }
  if (!(await contentReceiverIndexesReady(
    "category",
    connection.connection.db as unknown as ReceiverIndexDatabase,
  ))) {
    return NextResponse.json(
      { error: "Content receiver indexes are not ready" },
      { status: 503 },
    );
  }

  if (!idempotencyKey) {
    return NextResponse.json({ error: "Idempotency-Key header is required" }, { status: 400 });
  }
  let begun: Awaited<ReturnType<typeof beginPublish>>;
  try {
    begun = await beginPublish({
      idempotencyKey,
      tenantId: body.tenantId,
      contentType: "category",
      requestHash: hashPublishRequest(body),
    });
  } catch (error) {
    console.error("[content-receiver] receipt claim failed", {
      contentType: "category",
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

  const filtered = filterSupportedTranslations(body.translations);
  const droppedLocales = filtered.droppedLocales;
  const translations = withBaseLocaleBucket(
    filtered.translations,
    base.baseLocale,
    baseLocaleBucket(p),
  );

  let contentCommitted = false;
  try {
    // name and slug are both unique on the model — 409 on either so the engine
    // treats it as "exists" (de-dupe) rather than retrying a 500.
    const existing = await Category.findOne({
      $and: [
        { $or: [{ slug: p.slug }, { name: p.name }] },
        tenantFilter(body.tenantId),
      ],
    });
    if (existing) {
      const recovered = claim.resumed
        ? await Category.findOne({
            $and: [
              { slug: p.slug, contentEnginePublishReceiptId: claim.receiptId },
              tenantFilter(body.tenantId),
            ],
          })
        : null;
      if (recovered) {
        contentCommitted = true;
        const adopted = {
          id: String(recovered._id),
          slug: recovered.slug,
          liveUrl: liveUrlFor(recovered.slug, base.baseLocale),
          droppedLocales,
        };
        revalidateStorefrontContent();
        await completePublish(claim, 201, adopted);
        return NextResponse.json(adopted, { status: 201 });
      }
      await releasePublishClaim(claim);
      return NextResponse.json(
        {
          error: `A category with slug "${p.slug}" or name "${p.name}" already exists`,
          existingId: String(existing._id),
        },
        { status: 409 },
      );
    }

    // Engine sends SEO terms as `keywords`; accept `tags` as a fallback.
    const keywords = asStringArray(p.keywords ?? p.tags, 12);

    const doc = await Category.create({
      name: p.name,
      slug: p.slug,
      description: p.description,
      longDescription: p.longDescription,
      highlights: asStringArray(p.highlights, 12),
      features: asStringArray(p.features, 12),
      keywords,
      metaTitle: p.metaTitle,
      metaDescription: p.metaDescription,
      heroImage: heroFrom(p),
      featured: p.featured === true,
      isPublished: true,
      tenantId: tenant.tenantId,
      contentEnginePublishReceiptId: claim.receiptId,
      translations,
    });
    contentCommitted = true;

    const created = {
      id: String(doc._id),
      slug: doc.slug,
      liveUrl: liveUrlFor(doc.slug, base.baseLocale),
      droppedLocales,
    };
    revalidateStorefrontContent();
    await completePublish(claim, 201, created);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (!contentCommitted) {
      try {
        await releasePublishClaim(claim);
      } catch (releaseError) {
        console.error("[content-receiver] receipt release failed", {
          contentType: "category",
          errorName: releaseError instanceof Error ? releaseError.name : "UnknownError",
        });
      }
    }
    const duplicate =
      Boolean(err) && typeof err === "object" && (err as { code?: number }).code === 11000;
    if (duplicate) {
      return NextResponse.json({ error: "A category with this identity already exists" }, { status: 409 });
    }
    console.error("[content-receiver] publish failed", {
      contentType: "category",
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
  const p = body.payload!;

  const base = resolveBaseLocale(body.defaultLocale);
  if (!base.ok) return NextResponse.json({ error: base.error }, { status: 400 });

  let connection: Awaited<ReturnType<typeof dbConnect>>;
  try {
    connection = await dbConnect();
  } catch (error) {
    console.error("[content-receiver] database connection failed", {
      contentType: "category-update",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Content update is temporarily unavailable" }, { status: 503 });
  }
  if (!(await contentReceiverIndexesReady(
    "category",
    connection.connection.db as unknown as ReceiverIndexDatabase,
  ))) {
    return NextResponse.json({ error: "Content receiver indexes are not ready" }, { status: 503 });
  }

  try {
    const existing = await Category.findOne(tenantSlugFilter(p.slug!, body.tenantId));
    if (!existing) {
      return NextResponse.json(
        { error: `No category with slug "${p.slug}"` },
        { status: 404 },
      );
    }

    existing.name = p.name!;
    existing.description = p.description!;
    if (p.longDescription) existing.longDescription = p.longDescription;
    if (Array.isArray(p.highlights)) existing.highlights = asStringArray(p.highlights, 12);
    if (Array.isArray(p.features)) existing.features = asStringArray(p.features, 12);
    if (Array.isArray(p.keywords) || Array.isArray(p.tags)) {
      existing.keywords = asStringArray(p.keywords ?? p.tags, 12);
    }
    if (p.metaTitle) existing.metaTitle = p.metaTitle;
    if (p.metaDescription) existing.metaDescription = p.metaDescription;
    const hero = heroFrom(p);
    if (hero) existing.heroImage = hero;
    if (typeof p.featured === "boolean") existing.featured = p.featured;
    if (typeof p.published === "boolean") existing.isPublished = p.published;
    let droppedLocales: string[] = [];
    if (body.translations) {
      const filtered = filterSupportedTranslations(body.translations);
      droppedLocales = filtered.droppedLocales;
      existing.translations = withBaseLocaleBucket(
        filtered.translations,
        base.baseLocale,
        baseLocaleBucket(p),
      ) as typeof existing.translations;
    }

    await existing.save();
    revalidateStorefrontContent();
    return NextResponse.json({
      id: String(existing._id),
      slug: existing.slug,
      liveUrl: liveUrlFor(existing.slug, base.baseLocale),
      droppedLocales,
    });
  } catch (err) {
    const duplicate =
      Boolean(err) && typeof err === "object" && (err as { code?: number }).code === 11000;
    if (duplicate) {
      return NextResponse.json({ error: "A category with this identity already exists" }, { status: 409 });
    }
    console.error("[content-receiver] update failed", {
      contentType: "category",
      errorName: err instanceof Error ? err.name : "UnknownError",
    });
    return NextResponse.json({ error: "Content update failed; retry shortly" }, { status: 503 });
  }
}

export const POST = withAdminAudit(POSTHandler);
export const PUT = withAdminAudit(PUTHandler);
