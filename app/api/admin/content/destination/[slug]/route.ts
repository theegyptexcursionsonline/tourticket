// app/api/admin/content/destination/[slug]/route.ts
// GET: lookup endpoint for the foxes-content-engine.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Destination from "@/lib/models/Destination";
import { verifyContentEngine } from "@/lib/auth/verifyContentEngine";
import { tenantSlugFilter } from "@/lib/tenant/tenantScope";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const authError = verifyContentEngine(req);
  if (authError) return authError;

  const { slug } = await ctx.params;
  await dbConnect();

  // Optional ?tenantId= scopes the lookup; absent means the default site,
  // matching how the publish route namespaces slugs per tenant.
  const tenantId = req.nextUrl.searchParams.get("tenantId");
  const doc = (await Destination.findOne(tenantSlugFilter(slug, tenantId)).lean()) as
    | { _id: unknown; slug?: string; name?: string; isPublished?: boolean; tenantId?: string; updatedAt?: Date }
    | null;
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: String(doc._id),
    slug: doc.slug,
    name: doc.name,
    isPublished: doc.isPublished,
    tenantId: doc.tenantId ?? null,
    updatedAt: doc.updatedAt,
  });
}
