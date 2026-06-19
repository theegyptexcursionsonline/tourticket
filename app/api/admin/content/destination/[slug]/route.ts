// app/api/admin/content/destination/[slug]/route.ts
// GET: lookup endpoint for the foxes-content-engine.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Destination from "@/lib/models/Destination";
import { verifyContentEngine } from "@/lib/auth/verifyContentEngine";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const authError = verifyContentEngine(req);
  if (authError) return authError;

  const { slug } = await ctx.params;
  await dbConnect();
  const doc = (await Destination.findOne({ slug }).lean()) as
    | { _id: unknown; slug?: string; name?: string; isPublished?: boolean; updatedAt?: Date }
    | null;
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: String(doc._id),
    slug: doc.slug,
    name: doc.name,
    isPublished: doc.isPublished,
    updatedAt: doc.updatedAt,
  });
}
