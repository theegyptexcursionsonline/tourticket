// app/admin/tours/edit/[id]/page.tsx
"use server";

import TourForm from '@/components/TourForm'; // Keep your existing form component
import Link from 'next/link';
import { ArrowLeft, Eye, Clock, Tag, MapPin, Trash2, CheckCircle } from 'lucide-react';
import { notFound } from 'next/navigation';

import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';

async function getTourById(id: string) {
  await dbConnect();
  try {
    const tour = await Tour.findById(id).populate('destination').populate('categories');
    if (!tour) {
      return null;
    }
    // Convert Mongoose document to a plain object for the client component
    return JSON.parse(JSON.stringify(tour));
  } catch (error) {
    // This can happen if the ID format is invalid for MongoDB ObjectId
    console.error("Failed to fetch tour by ID:", error);
    return null;
  }
}

interface EditTourPageProps {
  params: {
    id: string;
  };
}

function MetaChip({ children, icon: Icon }: { children: React.ReactNode; icon?: any }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-white/60 backdrop-blur border border-white/30 shadow-sm">
      {Icon ? <Icon className="w-4 h-4 text-slate-600" /> : null}
      <span className="text-slate-700">{children}</span>
    </div>
  );
}

function formatDate(date?: string | number | null) {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleString();
  } catch {
    return String(date);
  }
}

export default async function EditTourPage({ params }: EditTourPageProps) {
  const { id } = params;
  const tour = await getTourById(id);

  if (!tour) {
    notFound(); // Triggers the not-found.tsx page if tour doesn't exist
  }

  const tourSlug = (tour.slug as string) || tour._id;
  const destinationName = tour.destination?.name || "Unassigned";
  const categories = Array.isArray(tour.categories) ? tour.categories : [];
  const status = tour.published ? "Published" : tour.draft ? "Draft" : "Unpublished";

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
      {/* Top navigation / Breadcrumb */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/tours"
            className="group inline-flex items-center gap-3 rounded-lg px-3 py-2 bg-white/60 border border-white/30 shadow-sm backdrop-blur hover:scale-[.995] transition-transform"
            aria-label="Back to Tours"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm font-medium text-slate-700">All Tours</span>
          </Link>

          <div className="ml-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Edit Tour
              <span className="ml-2 text-base font-medium text-slate-500">— {tour.title}</span>
            </h1>
            <p className="mt-1 text-sm text-slate-500 max-w-xl">
              Improve tour content, pricing, gallery and booking settings. Changes are saved in draft until you publish.
            </p>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-3">
          <Link
            href={`/tours/${tourSlug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border shadow-sm bg-white/60 border-white/30 backdrop-blur hover:shadow-md transition"
          >
            <Eye className="w-4 h-4 text-slate-700" />
            <span className="text-sm font-medium text-slate-700">Preview</span>
          </Link>

          {/* Quick publish indicator */}
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-tr from-emerald-50 to-emerald-100 border border-emerald-200 shadow-sm">
            <CheckCircle className={`w-4 h-4 ${tour.published ? "text-emerald-600" : "text-slate-400"}`} />
            <div className="text-sm">
              <div className="font-medium text-slate-800">{status}</div>
              <div className="text-xs text-slate-500">Last updated {formatDate(tour.updatedAt || tour.createdAt)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Card container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Main form area */}
        <section className="lg:col-span-2">
          <div className="rounded-2xl bg-white/60 border border-white/20 shadow-lg backdrop-blur p-6">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Tour Details</h2>
                <p className="mt-1 text-sm text-slate-500">Title, description, itinerary, price and gallery.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-slate-200 bg-white hover:shadow transition"
                >
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span className="text-rose-600 font-medium">Delete</span>
                </button>
              </div>
            </div>

            {/* TourForm - KEEP YOUR EXISTING FORM BEHAVIOR */}
            <div className="mt-4">
              {/* wrapper to add consistent spacing inside form area */}
              <div className="space-y-6">
                <TourForm tourToEdit={tour} />
              </div>
            </div>
          </div>
        </section>

        {/* Right: Meta / Quick settings */}
        <aside>
          <div className="sticky top-8 space-y-4">
            {/* Quick stats card */}
            <div className="rounded-2xl bg-white/55 border border-white/20 shadow p-5 backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-700">Quick Info</h3>
                  <p className="text-xs text-slate-500 mt-1">At-a-glance metadata and links</p>
                </div>
                <div className="text-sm font-semibold text-slate-800">{tour.duration ? `${tour.duration} days` : "—"}</div>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                <MetaChip icon={MapPin}>{destinationName}</MetaChip>

                <div className="flex flex-wrap gap-2">
                  {categories.length > 0 ? (
                    categories.map((cat: any) => (
                      <MetaChip key={cat._id || cat.id} icon={Tag}>
                        {cat.name}
                      </MetaChip>
                    ))
                  ) : (
                    <MetaChip icon={Tag}>No categories</MetaChip>
                  )}
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Updated</span>
                  </div>
                  <div className="text-sm font-medium text-slate-700">{formatDate(tour.updatedAt || tour.createdAt)}</div>
                </div>
              </div>
            </div>

            {/* Publish / visibility card */}
            <div className="rounded-2xl bg-white/55 border border-white/20 shadow p-5 backdrop-blur">
              <h4 className="text-sm font-semibold text-slate-700">Publish Controls</h4>
              <p className="text-xs text-slate-500 mt-1">Manage visibility and quick actions</p>

              <div className="mt-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-800">Visibility</div>
                    <div className="text-xs text-slate-500">Public / Private / Draft</div>
                  </div>

                  <div className="inline-flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 border border-slate-200">
                      {tour.published ? "Public" : tour.draft ? "Draft" : "Private"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="w-1/2 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-white border border-slate-200 shadow-sm hover:scale-[.995] transition"
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    className="w-1/2 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow hover:opacity-95 transition"
                  >
                    Publish
                  </button>
                </div>

                <Link
                  href="/admin/tours"
                  className="block text-xs text-slate-500 text-center mt-1 underline decoration-dotted"
                >
                  Back to listing
                </Link>
              </div>
            </div>

            {/* Helpful link card */}
            <div className="rounded-2xl bg-white/55 border border-white/20 shadow p-5 backdrop-blur">
              <h5 className="text-sm font-semibold text-slate-700">Resources</h5>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li className="flex items-center justify-between">
                  <span>Media Library</span>
                  <Link href="/admin/media" className="text-xs underline">Open</Link>
                </li>
                <li className="flex items-center justify-between">
                  <span>Bookings</span>
                  <Link href="/admin/bookings" className="text-xs underline">View</Link>
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
