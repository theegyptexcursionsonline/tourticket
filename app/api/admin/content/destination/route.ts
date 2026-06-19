// app/api/admin/content/destination/route.ts
// Adapter route for the foxes-content-engine — destination content type.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Destination from "@/lib/models/Destination";
import { verifyContentEngine } from "@/lib/auth/verifyContentEngine";

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
  payload?: IncomingPayload;
  translations?: Record<string, Record<string, unknown>>;
};

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

  await dbConnect();

  const existing = await Destination.findOne({ slug: p.slug });
  if (existing) {
    return NextResponse.json(
      { error: `A destination with slug "${p.slug}" already exists`, existingId: String(existing._id) },
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
      tenantId: body.tenantId,
      translations: body.translations ?? {},
    });

    return NextResponse.json(
      {
        id: String(doc._id),
        slug: doc.slug,
        liveUrl: liveUrlFor(doc.slug),
      },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Insert failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
