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

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Tour from "@/lib/models/Tour";
import Destination from "@/lib/models/Destination";
import Category from "@/lib/models/Category";
import { verifyContentEngine } from "@/lib/auth/verifyContentEngine";

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
  payload?: IncomingPayload;
  translations?: Record<string, Record<string, unknown>>;
};

function liveUrlFor(slug: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://www.egypt-excursionsonline.com";
  const locale = process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "en";
  return `${base}/${locale}/tours/${slug}`;
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

export async function POST(req: NextRequest) {
  const authError = verifyContentEngine(req);
  if (authError) return authError;

  let body: IncomingBody;
  try {
    body = (await req.json()) as IncomingBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const err = validate(body.payload);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const p = body.payload!;

  await dbConnect();

  const existing = await Tour.findOne({ slug: p.slug });
  if (existing) {
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
    });
    if (d) destinationId = d._id;
  }
  if (!destinationId) {
    const fallback = await Destination.findOne({}).sort({ createdAt: 1 });
    destinationId = fallback?._id;
  }
  if (!destinationId) {
    return NextResponse.json(
      {
        error:
          "Cannot create tour: no Destination exists in this database. Seed at least one destination first.",
      },
      { status: 422 },
    );
  }

  // Resolve category — pick first available; admin retargets later
  const cat = await Category.findOne({}).sort({ createdAt: 1 });
  if (!cat) {
    return NextResponse.json(
      {
        error:
          "Cannot create tour: no Category exists. Seed at least one category first.",
      },
      { status: 422 },
    );
  }

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
      tenantId: body.tenantId,
      translations: body.translations ?? {},
    });

    return NextResponse.json(
      {
        id: String(doc._id),
        slug: doc.slug,
        liveUrl: liveUrlFor(doc.slug),
        warning:
          "Tour created in DRAFT mode (isPublished=false). Set pricing, booking options, and final destination/category in the tourticket admin before publishing.",
      },
      { status: 201 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Insert failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
