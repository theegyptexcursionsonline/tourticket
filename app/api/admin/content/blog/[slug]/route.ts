// app/api/admin/content/blog/[slug]/route.ts
// Adapter GET endpoint for the foxes-content-engine.
// Used by the engine to check whether a slug already exists before publishing.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Blog from "@/lib/models/Blog";
import { verifyContentEngine } from "@/lib/auth/verifyContentEngine";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const authError = verifyContentEngine(req);
  if (authError) return authError;

  const { slug } = await ctx.params;
  await dbConnect();

  const blog = await Blog.findOne({ slug }).lean();
  if (!blog) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: String(blog._id),
    slug: blog.slug,
    title: blog.title,
    status: blog.status,
    updatedAt: blog.updatedAt,
  });
}
