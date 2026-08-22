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
import { isDefaultTenant, normalizeTenantId, tenantFilter, tenantSlugFilter } from "@/lib/tenant/tenantScope";
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

function storedCategoryTenantId(input: unknown): string {
  return isDefaultTenant(input) ? "default" : normalizeTenantId(input)!;
}

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
  if (!p.name || p.name.length < 2) return "name must be >= 2 chars";
  if (!p.slug || !/^[a-z0-9-]+$/.test(p.slug)) {
    return "slug must contain only lowercase letters, numbers, and hyphens";
  }
  if (!p.description || p.description.length < 10) {
    return "description must be >= 10 chars";
  }
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
    body = (await req.json()) as IncomingBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
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

  await dbConnect();

  let claim: PublishClaim | null = null;
  if (idempotencyKey) {
    const begun = await beginPublish({
      idempotencyKey,
      tenantId: body.tenantId,
      contentType: "category",
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

  const filtered = filterSupportedTranslations(body.translations);
  const droppedLocales = filtered.droppedLocales;
  const translations = withBaseLocaleBucket(
    filtered.translations,
    base.baseLocale,
    baseLocaleBucket(p),
  );

  // name and slug are both unique on the model — 409 on either so the engine
  // treats it as "exists" (de-dupe) rather than retrying a 500.
  const existing = await Category.findOne({
    $and: [
      { $or: [{ slug: p.slug }, { name: p.name }] },
      tenantFilter(body.tenantId),
    ],
  });
  if (existing) {
    if (claim?.resumed && existing.slug === p.slug) {
      const adopted = {
        id: String(existing._id),
        slug: existing.slug,
        liveUrl: liveUrlFor(existing.slug, base.baseLocale),
        droppedLocales,
      };
      await completePublish(claim, 201, adopted);
      return NextResponse.json(adopted, { status: 201 });
    }
    if (claim) await releasePublishClaim(claim);
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

  let contentCommitted = false;
  try {
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
      isPublished: p.published !== false,
      tenantId: storedCategoryTenantId(body.tenantId),
      translations,
    });
    contentCommitted = true;

    const created = {
      id: String(doc._id),
      slug: doc.slug,
      liveUrl: liveUrlFor(doc.slug, base.baseLocale),
      droppedLocales,
    };
    if (claim) await completePublish(claim, 201, created);
    revalidateStorefrontContent();
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
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
  const p = body.payload!;

  const base = resolveBaseLocale(body.defaultLocale);
  if (!base.ok) return NextResponse.json({ error: base.error }, { status: 400 });

  await dbConnect();

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

  try {
    await existing.save();
    revalidateStorefrontContent();
    return NextResponse.json({
      id: String(existing._id),
      slug: existing.slug,
      liveUrl: liveUrlFor(existing.slug, base.baseLocale),
      droppedLocales,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = withAdminAudit(POSTHandler);
export const PUT = withAdminAudit(PUTHandler);
