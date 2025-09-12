import mongoose, { Document, Schema, models } from 'mongoose';

export interface IBlogPost extends Document {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image: string;
  category: string;
  author: string;
  publishedAt: Date;
  readTime: number;
  tags: string[];
  status: 'published' | 'draft';
}

const BlogPostSchema: Schema = new Schema({
  title: { type: String, required: [true, 'Title is required.'], trim: true },
  slug: { type: String, required: [true, 'Slug is required.'], unique: true, trim: true },
  excerpt: { type: String, required: [true, 'Excerpt is required.'] },
  content: { type: String, required: [true, 'Content is required.'] },
  image: { type: String, required: [true, 'Featured image is required.'] },
  category: { type: String, required: [true, 'Category is required.'] },
  author: { type: String, required: true, default: 'Egypt Excursions Online' },
  publishedAt: { type: Date, default: Date.now },
  readTime: { type: Number, required: [true, 'Read time is required.'] },
  tags: [{ type: String }],
  status: { type: String, enum: ['published', 'draft'], default: 'draft' },
}, { timestamps: true });

export default models.BlogPost || mongoose.model<IBlogPost>('BlogPost', BlogPostSchema);
