import mongoose, { Schema, type Model } from 'mongoose';

export interface BlogLikeDocument {
  tenantId: string;
  blogId: mongoose.Types.ObjectId;
  visitorHash: string;
  likedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BlogLikeSchema = new Schema<BlogLikeDocument>(
  {
    tenantId: { type: String, required: true, trim: true, maxlength: 80, index: true },
    blogId: { type: Schema.Types.ObjectId, required: true, ref: 'Blog', index: true },
    visitorHash: { type: String, required: true, trim: true, maxlength: 64 },
    likedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

BlogLikeSchema.index(
  { tenantId: 1, blogId: 1, visitorHash: 1 },
  { unique: true, name: 'blog_like_tenant_post_visitor_unique' },
);
BlogLikeSchema.index({ tenantId: 1, blogId: 1, likedAt: -1 });

const BlogLike: Model<BlogLikeDocument> =
  mongoose.models.BlogLike || mongoose.model<BlogLikeDocument>('BlogLike', BlogLikeSchema);

export default BlogLike;
