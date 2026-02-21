import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IComment extends Document {
  postId: mongoose.Types.ObjectId;
  postType: 'blog' | 'tour' | 'destination';
  name: string;
  email?: string;
  body: string;
  status: 'pending' | 'approved' | 'rejected';
  parentId?: mongoose.Types.ObjectId; // For threaded comments/replies
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema: Schema = new Schema(
  {
    postId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    postType: {
      type: String,
      enum: ['blog', 'tour', 'destination'],
      required: true,
      default: 'blog',
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 255,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      required: true,
      index: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
CommentSchema.index({ postId: 1, postType: 1, status: 1 });
CommentSchema.index({ createdAt: -1 });

// Prevent duplicate model registration in development
const Comment: Model<IComment> =
  mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);

export default Comment;

