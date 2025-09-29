import TourCard from '@/components/shared/TourCard';

// Remove the existing TourCard component definition and replace the tours grid section with:

{/* Tours Grid */}
{filteredAndSortedTours.length > 0 ? (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
    {filteredAndSortedTours.map((tour, index) => (
      <TourCard key={tour._id} tour={tour} index={index} />
    ))}
  </div>
) : (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-center py-16"
  >
    <div className="w-24 h-24 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
      <Search className="w-10 h-10 text-slate-400" />
    </div>
    <h3 className="text-xl font-semibold text-slate-700 mb-2">No tours found</h3>
    <p className="text-slate-500 mb-6">
      {searchQuery ? 'Try adjusting your search criteria.' : 'No tours are currently available.'}
    </p>
    {searchQuery && (
      <button
        onClick={() => setSearchQuery('')}
        className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors"
      >
        Clear Search
      </button>
    )}
  </motion.div>
)}