// app/api/admin/content/destination/route.ts
// Adapter route for the foxes-content-engine — destination content type.

import { withAdminAudit } from '@/lib/admin/adminAudit';
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Destination from "@/lib/models/Destination";
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
    country: p.country,
    region: p.region,
    description: p.description,
    longDescription: p.longDescription,
    highlights: p.highlights,
    bestTimeToVisit: p.bestTimeToVisit,
    gettingThere: p.gettingThere,
    gettingAround: p.gettingAround,
    metaTitle: p.metaTitle,
    metaDescription: p.metaDescription,
  };
}

function liveUrlFor(slug: string, locale: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://www.egypt-excursionsonline.com";
  return `${base}${localizedContentPath("destination", slug, "default", locale)}`;
}

function validate(p: IncomingPayload | undefined): string | null {
  if (!p) return "payload is required";
  if (!isBoundedString(p.name, 2, 100)) {
    return "name must be a string between 2 and 100 chars";
  }
  if (typeof p.slug !== "string" || p.slug.length > 80 || !/^[a-z0-9-]+$/.test(p.slug)) {
    return "slug must contain only lowercase letters, numbers, and hyphens";
  }
  if (!isBoundedString(p.country, 2, 100)) return "country must be between 2 and 100 chars";
  if (!isBoundedString(p.region, 2, 100)) return "region must be between 2 and 100 chars";
  if (!isBoundedString(p.description, 40, 500)) {
    return "description must be a string between 40 and 500 chars";
  }
  if (!isBoundedString(p.longDescription, 200, 2_000)) return "longDescription must be between 200 and 2000 chars";
  if (!isBoundedStringArray(p.highlights, 4, 10, 5, 200)) return "highlights must contain 4 to 10 complete items";
  if (!isBoundedString(p.bestTimeToVisit, 20, 200)) return "bestTimeToVisit must be between 20 and 200 chars";
  if (!isBoundedString(p.gettingThere, 20, 500)) return "gettingThere must be between 20 and 500 chars";
  if (!isBoundedString(p.gettingAround, 20, 500)) return "gettingAround must be between 20 and 500 chars";
  if (!isBoundedStringArray(p.tags, 3, 10, 1, 50)) return "tags must contain 3 to 10 complete items";
  if (!isBoundedString(p.metaTitle, 5, 60)) return "metaTitle must be between 5 and 60 chars";
  if (!isBoundedString(p.metaDescription, 20, 160)) return "metaDescription must be between 20 and 160 chars";
  if (!isSafeHttpsUrl(p.featuredImage)) return "featuredImage must use the approved EEO HTTPS image host";
  if (p.published !== true) return "published must be true";
  if (typeof p.featured !== "boolean") return "featured must be a boolean";
  return null;
}

function asStringArray(v: unknown, max = 10): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, max);
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
      contentType: "destination",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "Content publish is temporarily unavailable" },
      { status: 503 },
    );
  }
  if (!(await contentReceiverIndexesReady(
    "destination",
    connection.connection.db as unknown as ReceiverIndexDatabase,
  ))) {
    return NextResponse.json(
      { error: "Content receiver indexes are not ready" },
      { status: 503 },
    );
  }

  // Claim the key before writing anything; a replayed key returns the original
  // response instead of publishing the destination a second time.
  if (!idempotencyKey) {
    return NextResponse.json({ error: "Idempotency-Key header is required" }, { status: 400 });
  }
  let begun: Awaited<ReturnType<typeof beginPublish>>;
  try {
    begun = await beginPublish({
      idempotencyKey,
      tenantId: body.tenantId,
      contentType: "destination",
      requestHash: hashPublishRequest(body),
    });
  } catch (error) {
    console.error("[content-receiver] receipt claim failed", {
      contentType: "destination",
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
    // Slugs and names are namespaced per tenant — the same slug/name may exist
    // on another tenant.
    const existing = await Destination.findOne(tenantSlugFilter(p.slug!, body.tenantId));
    if (existing) {
      const recovered = claim.resumed
        ? await Destination.findOne({
            ...tenantSlugFilter(p.slug!, body.tenantId),
            contentEnginePublishReceiptId: claim.receiptId,
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
        { error: `A destination with slug "${p.slug}" already exists`, existingId: String(existing._id) },
        { status: 409 },
      );
    }

    const existingName = await Destination.findOne({ name: p.name, ...tenantFilter(body.tenantId) });
    if (existingName) {
      await releasePublishClaim(claim);
      return NextResponse.json(
        { error: `A destination named "${p.name}" already exists`, existingId: String(existingName._id) },
        { status: 409 },
      );
    }

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
      image: p.featuredImage,
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

    // Mark processed only after the durable write and cache invalidation.
    await completePublish(claim, 201, created);

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (!contentCommitted) {
      try {
        await releasePublishClaim(claim);
      } catch (releaseError) {
        console.error("[content-receiver] receipt release failed", {
          contentType: "destination",
          errorName: releaseError instanceof Error ? releaseError.name : "UnknownError",
        });
      }
    }
    const duplicate =
      Boolean(err) && typeof err === "object" && (err as { code?: number }).code === 11000;
    if (duplicate) {
      return NextResponse.json({ error: "A destination with this identity already exists" }, { status: 409 });
    }
    console.error("[content-receiver] publish failed", {
      contentType: "destination",
      stage: contentCommitted ? "receipt-completion" : "content-write",
      errorName: err instanceof Error ? err.name : "UnknownError",
    });
    return NextResponse.json({ error: "Content publish failed; retry shortly" }, { status: 503 });
  }
}

export const POST = withAdminAudit(POSTHandler);
