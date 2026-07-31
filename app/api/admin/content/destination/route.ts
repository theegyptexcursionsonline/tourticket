// app/api/admin/content/destination/route.ts
// Adapter route for the foxes-content-engine — destination content type.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Destination from "@/lib/models/Destination";
import { verifyContentEngine } from "@/lib/auth/verifyContentEngine";
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
import { revalidateStorefrontContent } from "@/lib/storefront/revalidateTourStorefront";

type IncomingPayload = {
  name?: string;
  slug?: string;
  country?: string;
  region?: string;
  description?: string;
  longDescription?: string;
  highlights?: unknown;
  bestTimeToVisit?: string;
  gettingThere?: string;
  gettingAround?: string;
  tags?: unknown;
  metaTitle?: string;
  metaDescription?: string;
  featuredImage?: string;
  published?: boolean;
  featured?: boolean;
};

type IncomingBody = {
  tenantId?: string;
  // Language the base `payload` is written in; defaults to this site's default.
  defaultLocale?: string;
  payload?: IncomingPayload;
  translations?: Record<string, Record<string, unknown>>;
};

// The localized fields a reader can overlay, mirrored from the base payload
// when the engine wrote it in a non-default language.
function baseLocaleBucket(p: IncomingPayload): Record<string, unknown> {
  return {
    name: p.name,
    description: p.description,
    longDescription: p.longDescription,
    bestTimeToVisit: p.bestTimeToVisit,
    metaTitle: p.metaTitle,
    metaDescription: p.metaDescription,
  };
}

function liveUrlFor(slug: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://www.egypt-excursionsonline.com";
  const locale = process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "en";
  return `${base}/${locale}/destinations/${slug}`;
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

function asStringArray(v: unknown, max = 10): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, max);
}

export async function POST(req: NextRequest) {
  const authError = verifyContentEngine(req);
  if (authError) return authError;

  let body: IncomingBody;
  try {
    body = (await req.json()) as IncomingBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

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

  // Claim the key before writing anything; a replayed key returns the original
  // response instead of publishing the destination a second time.
  let claim: PublishClaim | null = null;
  if (idempotencyKey) {
    const begun = await beginPublish({
      idempotencyKey,
      tenantId: body.tenantId,
      contentType: "destination",
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

  // Slugs and names are namespaced per tenant — the same slug/name may exist
  // on another tenant.
  const existing = await Destination.findOne(tenantSlugFilter(p.slug!, body.tenantId));
  if (existing) {
    // A resumed claim means a previous attempt for THIS key died mid-publish,
    // so a record under the same slug is that attempt's own work — adopt it.
    if (claim?.resumed) {
      const adopted = {
        id: String(existing._id),
        slug: existing.slug,
        liveUrl: liveUrlFor(existing.slug),
        droppedLocales,
      };
      await completePublish(claim, 201, adopted);
      return NextResponse.json(adopted, { status: 201 });
    }
    if (claim) await releasePublishClaim(claim);
    return NextResponse.json(
      { error: `A destination with slug "${p.slug}" already exists`, existingId: String(existing._id) },
      { status: 409 },
    );
  }

  const existingName = await Destination.findOne({ name: p.name, ...tenantFilter(body.tenantId) });
  if (existingName) {
    if (claim) await releasePublishClaim(claim);
    return NextResponse.json(
      { error: `A destination named "${p.name}" already exists`, existingId: String(existingName._id) },
      { status: 409 },
    );
  }

  try {
    const doc = await Destination.create({
      name: p.name,
      slug: p.slug,
      country: p.country,
      region: p.region,
      description: p.description,
      longDescription: p.longDescription,
      highlights: asStringArray(p.highlights, 12),
      bestTimeToVisit: p.bestTimeToVisit,
      gettingThere: p.gettingThere,
      gettingAround: p.gettingAround,
      tags: asStringArray(p.tags, 12),
      metaTitle: p.metaTitle,
      metaDescription: p.metaDescription,
      featuredImage: p.featuredImage,
      featured: p.featured === true,
      isPublished: p.published !== false,
      tenantId: storedTenantId(body.tenantId),
      translations,
    });

    const created = {
      id: String(doc._id),
      slug: doc.slug,
      liveUrl: liveUrlFor(doc.slug),
      droppedLocales,
    };

    // Mark processed only now that the destination is committed — an attempt
    // that dies before this point leaves a claim the next retry can take over.
    if (claim) await completePublish(claim, 201, created);

    revalidateStorefrontContent();

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (claim) await releasePublishClaim(claim);
    const message = err instanceof Error ? err.message : "Insert failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
