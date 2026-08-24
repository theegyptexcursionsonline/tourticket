// app/api/admin/content/category/[slug]/route.ts
// GET: slug-lookup endpoint for the foxes-content-engine (duplicate preflight).

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Category from "@/lib/models/Category";
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
    | { _id: unknown; slug?: string; name?: string; tenantId?: string; isPublished?: boolean; updatedAt?: Date }
    | null;
  try {
    await dbConnect();
    doc = (await Category.findOne(tenantSlugFilter(slug, tenantId)).lean()) as typeof doc;
  } catch (error) {
    console.error("[content-receiver] lookup failed", {
      contentType: "category",
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
    tenantId: doc.tenantId ?? null,
    isPublished: doc.isPublished,
    updatedAt: doc.updatedAt,
  });
}
