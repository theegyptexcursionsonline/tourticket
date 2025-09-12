// app/admin/tours/new/page.tsx

import TourForm from '@/components/TourForm'; // Make sure this path is correct
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewTourPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {/* This Link is styled directly and does NOT use a <Button> component */}
        <Link 
          href="/admin/tours"
          className="p-2 border border-slate-300 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back to Tours</span>
        </Link>
        <h1 className="text-2xl font-semibold">Create a New Tour</h1>
      </div>
     
      <TourForm />
    </div>
  );
}