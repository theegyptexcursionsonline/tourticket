// app/api/admin/content/tour/route.ts
// Adapter route for the foxes-content-engine — tour content type.
//
// The Tour model requires Destination + Category ObjectId references that
// the AI doesn't know about. We resolve them at insert time:
//   1. destination: match by location string → existing Destination by name
//      (case-insensitive); fall back to first available
//   2. category: pick first available Category as a sane default
// The tour is created with `isPublished: false` so an admin can complete
// pricing / booking options / final categorization before publishing.

import { withAdminAudit } from '@/lib/admin/adminAudit';
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Tour from "@/lib/models/Tour";
import Destination from "@/lib/models/Destination";
import Category from "@/lib/models/Category";
import {
  verifyContentEngine,
  verifyContentEngineTenant,
} from "@/lib/auth/verifyContentEngine";
import { storedTenantId, tenantFilter, tenantSlugFilter } from "@/lib/tenant/tenantScope";
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

type ItineraryItem = { time?: string; title: string; description: string };
type FAQItem = { question: string; answer: string };

type IncomingPayload = {
  title?: string;
  slug?: string;
  location?: string;
  duration?: string;
  description?: string;
  longDescription?: string;
  highlights?: unknown;
  whatsIncluded?: unknown;
  whatsNotIncluded?: unknown;
  itinerary?: ItineraryItem[];
  faq?: FAQItem[];
  tags?: unknown;
  metaTitle?: string;
  metaDescription?: string;
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
    title: p.title,
    description: p.description,
    longDescription: p.longDescription,
    location: p.location,
    duration: p.duration,
    highlights: p.highlights,
    whatsIncluded: p.whatsIncluded,
    whatsNotIncluded: p.whatsNotIncluded,
    itinerary: p.itinerary,
    faq: p.faq,
    tags: p.tags,
    metaTitle: p.metaTitle,
    metaDescription: p.metaDescription,
  };
}

function liveUrlFor(slug: string, locale: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://www.egypt-excursionsonline.com";
  return `${base}${localizedContentPath("tour", slug, "default", locale)}`;
}

function validate(p: IncomingPayload | undefined): string | null {
  if (!p) return "payload is required";
  if (!p.title || p.title.length < 5) return "title must be >= 5 chars";
  if (!p.slug || !/^[a-z0-9-]+$/.test(p.slug)) {
    return "slug must contain only lowercase letters, numbers, and hyphens";
  }
  if (!p.description || p.description.length < 20) {
    return "description must be >= 20 chars";
  }
  if (!p.duration) return "duration is required";
  return null;
}

function asStringArray(v: unknown, max = 12): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, max);
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

  const err = validate(body.payload);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
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
      contentType: "tour",
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

  const existing = await Tour.findOne(tenantSlugFilter(p.slug!, body.tenantId));
  if (existing) {
    if (claim?.resumed) {
      const adopted = {
        id: String(existing._id),
        slug: existing.slug,
        liveUrl: liveUrlFor(existing.slug, base.baseLocale),
        droppedLocales,
        warning:
          "Tour created in DRAFT mode (isPublished=false). Complete pricing, booking options and categorization before publishing.",
      };
      await completePublish(claim, 201, adopted);
      return NextResponse.json(adopted, { status: 201 });
    }
    if (claim) await releasePublishClaim(claim);
    return NextResponse.json(
      { error: `A tour with slug "${p.slug}" already exists`, existingId: String(existing._id) },
      { status: 409 },
    );
  }

  // Resolve destination (by location → name match; fall back to first)
  let destinationId: unknown;
  if (p.location) {
    const d = await Destination.findOne({
      name: { $regex: `^${p.location.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, $options: "i" },
      ...tenantFilter(body.tenantId),
    });
    if (d) destinationId = d._id;
  }
  if (!destinationId) {
    const fallback = await Destination.findOne(tenantFilter(body.tenantId)).sort({ createdAt: 1 });
    destinationId = fallback?._id;
  }
  if (!destinationId) {
    if (claim) await releasePublishClaim(claim);
    return NextResponse.json(
      {
        error:
          "Cannot create tour: no Destination exists in this database. Seed at least one destination first.",
      },
      { status: 422 },
    );
  }

  // Resolve category — pick first available; admin retargets later
  const cat = await Category.findOne(tenantFilter(body.tenantId)).sort({ createdAt: 1 });
  if (!cat) {
    if (claim) await releasePublishClaim(claim);
    return NextResponse.json(
      {
        error:
          "Cannot create tour: no Category exists. Seed at least one category first.",
      },
      { status: 422 },
    );
  }

  let contentCommitted = false;
  try {
    const doc = await Tour.create({
      title: p.title,
      slug: p.slug,
      destination: destinationId,
      category: [cat._id],
      description: p.description,
      longDescription: p.longDescription,
      location: p.location,
      duration: p.duration,
      highlights: asStringArray(p.highlights),
      whatsIncluded: asStringArray(p.whatsIncluded),
      whatsNotIncluded: asStringArray(p.whatsNotIncluded),
      itinerary: Array.isArray(p.itinerary) ? p.itinerary.slice(0, 12) : [],
      faq: Array.isArray(p.faq) ? p.faq.slice(0, 12) : [],
      tags: asStringArray(p.tags),
      metaTitle: p.metaTitle,
      metaDescription: p.metaDescription,
      featuredImage: p.featuredImage,
      // Defaults that keep the model valid until ops completes the tour
      discountPrice: 0,
      price: 0,
      currency: "USD",
      isPublished: false, // safety: admin must complete pricing before going live
      featured: false,
      tenantId: storedTenantId(body.tenantId),
      translations,
    });
    contentCommitted = true;

    const created = {
      id: String(doc._id),
      slug: doc.slug,
      liveUrl: liveUrlFor(doc.slug, base.baseLocale),
      droppedLocales,
      warning:
        "Tour created in DRAFT mode (isPublished=false). Complete pricing, booking options and categorization before publishing.",
    };

    if (claim) await completePublish(claim, 201, created);
    revalidateStorefrontContent();
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (claim && !contentCommitted) await releasePublishClaim(claim);
    const message = e instanceof Error ? e.message : "Insert failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = withAdminAudit(POSTHandler);
