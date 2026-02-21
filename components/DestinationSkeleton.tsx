// components/DestinationSkeleton.tsx
export const DestinationSkeleton = () => (
  <div className="text-center group animate-pulse">
    <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden shadow-lg bg-slate-200 mx-auto" />
    <div className="mt-4 space-y-2">
      <div className="h-4 bg-slate-200 rounded w-24 mx-auto" />
      <div className="h-3 bg-slate-200 rounded w-16 mx-auto" />
    </div>
  </div>
);

export const DestinationsLoadingSkeleton = () => (
  <section className="bg-white py-16">
    <div className="container mx-auto px-4">
      <div className="h-8 w-64 bg-slate-200 rounded-lg mb-8 animate-pulse" />
      <div className="flex justify-center gap-6 sm:gap-8 flex-wrap">
        {Array.from({ length: 6 }, (_, i) => (
          <DestinationSkeleton key={i} />
        ))}
      </div>
    </div>
  </section>
);