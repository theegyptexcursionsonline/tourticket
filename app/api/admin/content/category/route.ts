// app/api/admin/content/category/route.ts
// Adapter route for the foxes-content-engine — category / landing page type.
// Auth: Bearer token in Authorization header (CONTENT_ENGINE_API_KEY).
// POST creates a new category; PUT updates an existing one by slug.
// Reuses the existing Category model + the /{locale}/categories/{slug} page.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Category from "@/lib/models/Category";
import { verifyContentEngine } from "@/lib/auth/verifyContentEngine";

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
  payload?: IncomingPayload;
  translations?: Record<string, Record<string, unknown>>;
};

function liveUrlFor(slug: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://www.egypt-excursionsonline.com";
  const locale = process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "en";
  return `${base}/${locale}/categories/${slug}`;
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

  // name and slug are both unique on the model — 409 on either so the engine
  // treats it as "exists" (de-dupe) rather than retrying a 500.
  const existing = await Category.findOne({
    $or: [{ slug: p.slug }, { name: p.name }],
  });
  if (existing) {
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
      tenantId: body.tenantId,
      translations: body.translations ?? {},
    });

    return NextResponse.json(
      { id: String(doc._id), slug: doc.slug, liveUrl: liveUrlFor(doc.slug) },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Insert failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
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

  const existing = await Category.findOne({ slug: p.slug });
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

  try {
    await existing.save();
    return NextResponse.json({
      id: String(existing._id),
      slug: existing.slug,
      liveUrl: liveUrlFor(existing.slug),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
