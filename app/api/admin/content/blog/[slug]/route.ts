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
import { localePath } from "@/lib/i18n/seoAlternates";
import { defaultLocale } from "@/i18n/config";

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
  let blog;
  try {
    await dbConnect();
    blog = await Blog.findOne(tenantSlugFilter(slug, tenantId))
      .select("+contentEnginePublishReceiptId")
      .lean();
  } catch (error) {
    console.error("[content-receiver] lookup failed", {
      contentType: "blog",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Content lookup is temporarily unavailable" }, { status: 503 });
  }
  if (!blog) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const status = blog.archivedAt ? "archived" : blog.status;
  // This flagship receiver admits only the default tenant and English base
  // locale. Never echo a caller's locale or host as publication evidence.
  return NextResponse.json({
    id: String(blog._id),
    slug: blog.slug,
    title: blog.title,
    status,
    revision: blog.__v,
    tenantId: blog.tenantId ?? null,
    updatedAt: blog.updatedAt,
    publishReceiptId: blog.contentEnginePublishReceiptId ?? null,
    locale: defaultLocale,
    ...(status === "published" ? { liveUrl: localePath(defaultLocale, `/blog/${encodeURIComponent(blog.slug)}`) } : {}),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
