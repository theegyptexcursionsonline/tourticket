import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await dbConnect();
    
    const { slug } = params;
    
    const blog = await Blog.findOne({ slug, status: 'published' });
    
    if (!blog) {
      return NextResponse.json({ 
        success: false, 
        error: 'Blog post not found' 
      }, { status: 404 });
    }
    
    // Increment like count
    await Blog.findByIdAndUpdate(blog._id, { $inc: { likes: 1 } });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Blog post liked successfully' 
    });
  } catch (error) {
    console.error('Error liking blog post:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to like blog post' 
    }, { status: 500 });
  }
}