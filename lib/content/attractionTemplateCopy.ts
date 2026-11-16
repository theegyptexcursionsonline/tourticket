// Interface text for the older attraction page (AttractionLandingPage) and
// catalogue page (AttractionPageTemplate) templates. Page content (titles,
// descriptions, tips, FAQs, trip names) comes from the record and its
// translations; this table only covers the template's own labels, which were
// English on every language. Same pattern as the destination and category
// pages: Arabic gets its own wording, the other languages keep English.
import { useLocale } from 'next-intl';

export type AttractionTemplateCopy = {
  dateLocale: string;
  // attraction page
  attractionsRoot: string;
  popularAttraction: string;
  reviewsCount: (count: number) => string;
  activitiesCount: (count: number) => string;
  whatToExpect: string;
  showLess: string;
  readMore: string;
  searchActivities: string;
  sortMostPopular: string;
  sortPriceLow: string;
  sortPriceHigh: string;
  sortTopRated: string;
  sortDuration: string;
  sortNewest: string;
  gridView: string;
  listView: string;
  reviewsTitle: string;
  reviewsSubtitle: string;
  anonymous: string;
  showAllReviews: (count: number) => string;
  gallery: string;
  whatMakesThisSpecial: string;
  availableActivities: string;
  resultsCount: (count: number) => string;
  noActivitiesFound: string;
  tryAdjustingSearch: string;
  checkBackSoon: string;
  clearSearch: string;
  travelTips: string;
  faqTitle: string;
  similarAttractions: string;
  similarAttractionsSubtitle: string;
  topExperiences: string;
  topExperiencesSubtitle: string;
  readyToExplore: (title: string) => string;
  bookNowMemories: string;
  viewAllActivities: string;
  contactUs: string;
  // catalogue page
  searchTours: string;
  sortFeaturedFirst: string;
  sortHighestRated: string;
  sortNewestFirst: string;
  filters: string;
  featured: string;
  toursAvailable: string;
  customerReviews: string;
  averageRating: string;
  whyThousandsChooseUs: string;
  customersSay: string;
  customersSaySubtitle: string;
  whyChooseThisExperience: string;
  whatMakesThisSpecialTitle: string;
  noToursFound: string;
  tryAdjustingCriteria: string;
  clearSearchTitle: string;
  relatedGuides: string;
  readyToStart: string;
  readyToStartBody: string;
  browseAllTours: string;
  getExpertAdvice: string;
  maxGroup: (size: number) => string;
  tourReviews: (count: number) => string;
  showLessTitle: string;
  viewAllReviews: (count: number) => string;
  showingOf: (shown: number, total: number) => string;
  categoriesRoot: string;
};

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

// Arabic counts: 1 → singular, 2 → dual, 3–10 → plural, 11+ → singular accusative.
const arabicCount = (count: number, one: string, two: string, few: string, many: string) =>
  count === 1 ? one : count === 2 ? two : count >= 3 && count <= 10 ? `${count} ${few}` : `${count} ${many}`;

export const ATTRACTION_TEMPLATE_COPY: Record<'en' | 'ar', AttractionTemplateCopy> = {
  en: {
    dateLocale: 'en-US',
    attractionsRoot: 'Attractions',
    popularAttraction: 'Popular attraction',
    reviewsCount: (count) => plural(count, 'review', 'reviews'),
    activitiesCount: (count) => plural(count, 'activity', 'activities'),
    whatToExpect: 'What to Expect',
    showLess: 'Show less',
    readMore: 'Read more',
    searchActivities: 'Search activities...',
    sortMostPopular: 'Most popular',
    sortPriceLow: 'Price: Low to High',
    sortPriceHigh: 'Price: High to Low',
    sortTopRated: 'Top rated',
    sortDuration: 'Duration',
    sortNewest: 'Newest',
    gridView: 'Grid view',
    listView: 'List view',
    reviewsTitle: 'Reviews from travelers',
    reviewsSubtitle: 'See what others say about their experience',
    anonymous: 'Anonymous',
    showAllReviews: (count) => `Show all ${count} reviews`,
    gallery: 'Gallery',
    whatMakesThisSpecial: 'What makes this special',
    availableActivities: 'Available activities',
    resultsCount: (count) => plural(count, 'result', 'results'),
    noActivitiesFound: 'No activities found',
    tryAdjustingSearch: 'Try adjusting your search',
    checkBackSoon: 'Check back soon for new activities',
    clearSearch: 'Clear search',
    travelTips: 'Travel tips',
    faqTitle: 'Frequently asked questions',
    similarAttractions: 'Similar attractions',
    similarAttractionsSubtitle: 'Explore more places you might like',
    topExperiences: 'Top experiences',
    topExperiencesSubtitle: "Don't miss these popular activities",
    readyToExplore: (title) => `Ready to explore ${title}?`,
    bookNowMemories: 'Book now and create unforgettable memories',
    viewAllActivities: 'View all activities',
    contactUs: 'Contact us',
    searchTours: 'Search tours...',
    sortFeaturedFirst: 'Featured First',
    sortHighestRated: 'Highest Rated',
    sortNewestFirst: 'Newest First',
    filters: 'Filters',
    featured: 'Featured',
    toursAvailable: 'Tours Available',
    customerReviews: 'Customer Reviews',
    averageRating: 'Average Rating',
    whyThousandsChooseUs: 'Why Thousands Choose Us',
    customersSay: 'What Our Customers Say',
    customersSaySubtitle: 'Read reviews from travelers who have experienced these tours',
    whyChooseThisExperience: 'Why Choose This Experience',
    whatMakesThisSpecialTitle: 'What Makes This Special',
    noToursFound: 'No tours found',
    tryAdjustingCriteria: 'Try adjusting your search criteria or browse all tours.',
    clearSearchTitle: 'Clear Search',
    relatedGuides: 'Related guides and collections',
    readyToStart: 'Ready to Start Your Adventure?',
    readyToStartBody: 'Join thousands of travelers who have discovered amazing experiences with us. Your perfect adventure is just a click away.',
    browseAllTours: 'Browse All Tours',
    getExpertAdvice: 'Get Expert Advice',
    maxGroup: (size) => `Max ${size}`,
    tourReviews: (count) => plural(count, 'review', 'reviews'),
    showLessTitle: 'Show Less',
    viewAllReviews: (count) => `View All ${count} Reviews`,
    showingOf: (shown, total) => `Showing ${shown} of ${total} tours`,
    categoriesRoot: 'Categories',
  },
  ar: {
    dateLocale: 'ar-u-nu-latn',
    attractionsRoot: 'المعالم السياحية',
    popularAttraction: 'معلم سياحي مميز',
    reviewsCount: (count) => arabicCount(count, 'تقييم واحد', 'تقييمان', 'تقييمات', 'تقييمًا'),
    activitiesCount: (count) => arabicCount(count, 'نشاط واحد', 'نشاطان', 'أنشطة', 'نشاطًا'),
    whatToExpect: 'ماذا تتوقع',
    showLess: 'عرض أقل',
    readMore: 'اقرأ المزيد',
    searchActivities: 'ابحث في الأنشطة...',
    sortMostPopular: 'الأكثر شعبية',
    sortPriceLow: 'السعر: من الأقل إلى الأعلى',
    sortPriceHigh: 'السعر: من الأعلى إلى الأقل',
    sortTopRated: 'الأعلى تقييمًا',
    sortDuration: 'المدة',
    sortNewest: 'الأحدث',
    gridView: 'عرض شبكي',
    listView: 'عرض قائمة',
    reviewsTitle: 'تقييمات المسافرين',
    reviewsSubtitle: 'اطّلع على آراء الآخرين في تجربتهم',
    anonymous: 'مجهول',
    showAllReviews: (count) => `عرض جميع التقييمات (${count})`,
    gallery: 'معرض الصور',
    whatMakesThisSpecial: 'ما الذي يميز هذا المكان',
    availableActivities: 'الأنشطة المتاحة',
    resultsCount: (count) => arabicCount(count, 'نتيجة واحدة', 'نتيجتان', 'نتائج', 'نتيجة'),
    noActivitiesFound: 'لم يتم العثور على أنشطة',
    tryAdjustingSearch: 'جرّب تعديل البحث',
    checkBackSoon: 'عد قريبًا لاكتشاف أنشطة جديدة',
    clearSearch: 'مسح البحث',
    travelTips: 'نصائح السفر',
    faqTitle: 'الأسئلة الشائعة',
    similarAttractions: 'معالم مشابهة',
    similarAttractionsSubtitle: 'اكتشف المزيد من الأماكن التي قد تعجبك',
    topExperiences: 'أفضل التجارب',
    topExperiencesSubtitle: 'لا تفوّت هذه الأنشطة الشائعة',
    readyToExplore: (title) => `هل أنت مستعد لاستكشاف ${title}؟`,
    bookNowMemories: 'احجز الآن واصنع ذكريات لا تُنسى',
    viewAllActivities: 'عرض جميع الأنشطة',
    contactUs: 'تواصل معنا',
    searchTours: 'ابحث عن الجولات...',
    sortFeaturedFirst: 'المميزة أولًا',
    sortHighestRated: 'الأعلى تقييمًا',
    sortNewestFirst: 'الأحدث أولًا',
    filters: 'عوامل التصفية',
    featured: 'مميزة',
    toursAvailable: 'جولات متاحة',
    customerReviews: 'تقييمات العملاء',
    averageRating: 'متوسط التقييم',
    whyThousandsChooseUs: 'لماذا يختارنا الآلاف',
    customersSay: 'ماذا يقول عملاؤنا',
    customersSaySubtitle: 'اقرأ تقييمات المسافرين الذين جرّبوا هذه الجولات',
    whyChooseThisExperience: 'لماذا تختار هذه التجربة',
    whatMakesThisSpecialTitle: 'ما الذي يميزها',
    noToursFound: 'لم يتم العثور على جولات',
    tryAdjustingCriteria: 'جرّب تعديل معايير البحث أو تصفّح جميع الجولات.',
    clearSearchTitle: 'مسح البحث',
    relatedGuides: 'أدلة ومجموعات ذات صلة',
    readyToStart: 'هل أنت مستعد لبدء مغامرتك؟',
    readyToStartBody: 'انضم إلى آلاف المسافرين الذين اكتشفوا معنا تجارب رائعة. مغامرتك المثالية على بُعد نقرة واحدة.',
    browseAllTours: 'تصفّح جميع الجولات',
    getExpertAdvice: 'احصل على نصيحة خبير',
    maxGroup: (size) => `حتى ${size} أشخاص`,
    tourReviews: (count) => arabicCount(count, 'تقييم واحد', 'تقييمان', 'تقييمات', 'تقييمًا'),
    showLessTitle: 'عرض أقل',
    viewAllReviews: (count) => `عرض جميع التقييمات (${count})`,
    showingOf: (shown, total) => `عرض ${shown} من ${total} جولة`,
    categoriesRoot: 'الفئات',
  },
};

export function attractionTemplateCopyFor(locale: string): AttractionTemplateCopy {
  return locale.startsWith('ar') ? ATTRACTION_TEMPLATE_COPY.ar : ATTRACTION_TEMPLATE_COPY.en;
}

export function useAttractionTemplateCopy(): AttractionTemplateCopy {
  return attractionTemplateCopyFor(useLocale());
}
