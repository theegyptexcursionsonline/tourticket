// Route-level loading state for all localized public pages. Navigations that
// miss the edge cache previously froze on the old page for seconds; this
// gives instant visual feedback while the destination/tour page streams in.
export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-red-600 animate-spin" />
      <p className="text-slate-500 text-sm font-medium">Loading…</p>
    </div>
  );
}
