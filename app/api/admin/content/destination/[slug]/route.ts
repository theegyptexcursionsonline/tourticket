// app/api/admin/content/destination/[slug]/route.ts
// GET: lookup endpoint for the foxes-content-engine.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Destination from "@/lib/models/Destination";
import {
  verifyContentEngine,
  verifyContentEngineTenant,
} from "@/lib/auth/verifyContentEngine";
import { tenantSlugFilter } from "@/lib/tenant/tenantScope";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const authError = verifyContentEngine(req);
  if (authError) return authError;

  const { slug } = await ctx.params;
  const tenant = verifyContentEngineTenant(req.nextUrl.searchParams.get("tenantId"));
  if (!tenant.ok) return tenant.response;
  const tenantId = tenant.tenantId;
  let doc:
    | { _id: unknown; slug?: string; name?: string; isPublished?: boolean; tenantId?: string; updatedAt?: Date }
    | null;
  try {
    await dbConnect();
    doc = (await Destination.findOne(tenantSlugFilter(slug, tenantId)).lean()) as typeof doc;
  } catch (error) {
    console.error("[content-receiver] lookup failed", {
      contentType: "destination",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Content lookup is temporarily unavailable" }, { status: 503 });
  }
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
