import { blogRelatedPopulations } from '@/lib/content/blogReferences';
import React from 'react';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';
import { IBlog } from '@/lib/models/Blog';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { authorizeAdminPage } from '@/lib/auth/adminPageAccess';
import type { AdminPermission } from '@/lib/constants/adminPermissions';
import AdminPageAccessState, { AdminLoadFailed } from '@/components/admin/AdminPageAccessState';
import BlogManager from './BlogManager';

// Rendered per request: the response depends on who is asking.
export const dynamic = 'force-dynamic';

const REQUIRED_PERMISSIONS: AdminPermission[] = ['manageContent'];

async function getBlogs(): Promise<IBlog[] | null> {
  try {
    await dbConnect();
    const blogs = await Blog.find({ ...DEFAULT_TENANT_FILTER, archivedAt: null })
      .sort({ createdAt: -1 })
      .populate(blogRelatedPopulations('admin'))
      .lean();
    return JSON.parse(JSON.stringify(blogs));
  } catch (error) {
    console.error('Error fetching blogs:', error);
    // A failed read is not an empty blog: let the page say it failed.
    return null;
  }
}

export default async function AdminBlogPage() {
  const access = await authorizeAdminPage(REQUIRED_PERMISSIONS);
  if (!access.granted) {
    return <AdminPageAccessState denial={access.denial} requiredPermissions={REQUIRED_PERMISSIONS} />;
  }

  const blogs = await getBlogs();
  if (!blogs) {
    return <AdminLoadFailed what="blog posts" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Blog Posts</h1>
        <p className="text-slate-600 mt-1">
          Create and manage your travel blog content.
        </p>
      </div>

      <BlogManager initialBlogs={blogs} />
    </div>
  );
}
