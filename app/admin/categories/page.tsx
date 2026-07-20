import { redirect } from 'next/navigation';

// The Category section merged into the unified Pages section.
export default function CategoriesPage() {
  redirect('/admin/pages');
}
