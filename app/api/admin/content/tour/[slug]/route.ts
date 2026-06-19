// app/api/admin/content/tour/[slug]/route.ts
// GET: lookup endpoint for the foxes-content-engine.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Tour from "@/lib/models/Tour";
import { verifyContentEngine } from "@/lib/auth/verifyContentEngine";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const authError = verifyContentEngine(req);
  if (authError) return authError;

  const { slug } = await ctx.params;
  await dbConnect();
  const doc = await Tour.findOne({ slug }).lean();
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: String(doc._id),
    slug: doc.slug,
    title: doc.title,
    isPublished: doc.isPublished,
    updatedAt: doc.updatedAt,
  });
}
