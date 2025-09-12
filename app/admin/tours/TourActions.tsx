// app/admin/tours/TourActions.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Edit, Trash2, Loader2, X } from 'lucide-react';

export default function TourActions({ tourId }: { tourId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/tours/${tourId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setIsModalOpen(false);
        router.refresh();
      } else {
        alert('Failed to delete the tour. Please try again.');
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <Link 
          href={`/admin/tours/edit/${tourId}`} 
          className="p-2 border border-slate-300 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
        >
          <Edit className="h-4 w-4" />
          <span className="sr-only">Edit</span>
        </Link>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="p-2 border border-red-200 bg-red-50 rounded-md text-red-600 hover:bg-red-100 hover:text-red-800 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete</span>
        </button>
      </div>

      {/* Custom Deletion Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="text-center">
              <h3 id="modal-title" className="text-lg font-semibold text-slate-900">
                Are you absolutely sure?
              </h3>
              <div className="mt-2">
                <p className="text-sm text-slate-600">
                  This action cannot be undone. This will permanently delete the tour.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="inline-flex justify-center px-4 py-2 text-sm font-semibold text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:bg-red-300"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Yes, delete it'
                )}
              </button>
            </div>
             <button onClick={() => setIsModalOpen(false)} className="absolute top-2 right-2 p-1 rounded-full text-slate-400 hover:bg-slate-100">
                <X size={20}/>
             </button>
          </div>
        </div>
      )}
    </>
  );
}