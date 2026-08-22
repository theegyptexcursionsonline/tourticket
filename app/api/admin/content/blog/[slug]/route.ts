// app/api/admin/content/blog/[slug]/route.ts
// Adapter GET endpoint for the foxes-content-engine.
// Used by the engine to check whether a slug already exists before publishing.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Blog from "@/lib/models/Blog";
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
  await dbConnect();

  // Optional ?tenantId= scopes the lookup; absent means the default site,
  // matching how the publish routes namespace slugs per tenant.
  const tenant = verifyContentEngineTenant(req.nextUrl.searchParams.get("tenantId"));
  if (!tenant.ok) return tenant.response;
  const tenantId = tenant.tenantId;
  const blog = await Blog.findOne(tenantSlugFilter(slug, tenantId)).lean();
  if (!blog) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: String(blog._id),
    slug: blog.slug,
    title: blog.title,
    status: blog.status,
    tenantId: blog.tenantId ?? null,
    updatedAt: blog.updatedAt,
  });
}
