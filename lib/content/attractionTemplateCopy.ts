// Interface text for the older attraction page (AttractionLandingPage) and
// catalogue page (AttractionPageTemplate) templates. Page content (titles,
// descriptions, tips, FAQs, trip names) comes from the record and its
// translations; this table only covers the template's own labels, which were
// English on every language. Same pattern as the destination and category
// pages; each site language (English, Arabic, German, French, Spanish) has its own wording.
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

export const ATTRACTION_TEMPLATE_COPY: Record<'en' | 'ar' | 'de' | 'fr' | 'es', AttractionTemplateCopy> = {
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
  de: {
    dateLocale: 'de-DE',
    attractionsRoot: 'Sehenswürdigkeiten',
    popularAttraction: 'Beliebte Sehenswürdigkeit',
    reviewsCount: (count) => plural(count, 'Bewertung', 'Bewertungen'),
    activitiesCount: (count) => plural(count, 'Aktivität', 'Aktivitäten'),
    whatToExpect: 'Was Sie erwartet',
    showLess: 'Weniger anzeigen',
    readMore: 'Mehr lesen',
    searchActivities: 'Aktivitäten suchen …',
    sortMostPopular: 'Am beliebtesten',
    sortPriceLow: 'Preis: aufsteigend',
    sortPriceHigh: 'Preis: absteigend',
    sortTopRated: 'Am besten bewertet',
    sortDuration: 'Dauer',
    sortNewest: 'Neueste zuerst',
    gridView: 'Kachelansicht',
    listView: 'Listenansicht',
    reviewsTitle: 'Bewertungen von Reisenden',
    reviewsSubtitle: 'Das sagen andere über ihre Erfahrung',
    anonymous: 'Anonym',
    showAllReviews: (count) => `Alle ${count} Bewertungen anzeigen`,
    gallery: 'Bildergalerie',
    whatMakesThisSpecial: 'Was diesen Ort besonders macht',
    availableActivities: 'Verfügbare Aktivitäten',
    resultsCount: (count) => plural(count, 'Ergebnis', 'Ergebnisse'),
    noActivitiesFound: 'Keine Aktivitäten gefunden',
    tryAdjustingSearch: 'Versuchen Sie einen anderen Suchbegriff',
    checkBackSoon: 'Schauen Sie bald wieder vorbei, neue Aktivitäten folgen',
    clearSearch: 'Suche zurücksetzen',
    travelTips: 'Reisetipps',
    faqTitle: 'Häufig gestellte Fragen',
    similarAttractions: 'Ähnliche Sehenswürdigkeiten',
    similarAttractionsSubtitle: 'Weitere Orte, die Ihnen gefallen könnten',
    topExperiences: 'Top-Erlebnisse',
    topExperiencesSubtitle: 'Diese beliebten Aktivitäten sollten Sie nicht verpassen',
    readyToExplore: (title) => `Bereit für ${title}?`,
    bookNowMemories: 'Jetzt buchen und unvergessliche Momente erleben',
    viewAllActivities: 'Alle Aktivitäten ansehen',
    contactUs: 'Kontakt',
    searchTours: 'Touren suchen …',
    sortFeaturedFirst: 'Empfohlene zuerst',
    sortHighestRated: 'Am besten bewertet',
    sortNewestFirst: 'Neueste zuerst',
    filters: 'Filter',
    featured: 'Empfohlen',
    toursAvailable: 'Verfügbare Touren',
    customerReviews: 'Kundenbewertungen',
    averageRating: 'Durchschnittliche Bewertung',
    whyThousandsChooseUs: 'Warum Tausende uns wählen',
    customersSay: 'Das sagen unsere Kunden',
    customersSaySubtitle: 'Bewertungen von Reisenden, die diese Touren erlebt haben',
    whyChooseThisExperience: 'Warum dieses Erlebnis',
    whatMakesThisSpecialTitle: 'Das macht es besonders',
    noToursFound: 'Keine Touren gefunden',
    tryAdjustingCriteria: 'Passen Sie Ihre Suche an oder sehen Sie sich alle Touren an.',
    clearSearchTitle: 'Suche zurücksetzen',
    relatedGuides: 'Passende Reiseführer und Sammlungen',
    readyToStart: 'Bereit für Ihr Abenteuer?',
    readyToStartBody: 'Tausende Reisende haben mit uns schon besondere Erlebnisse entdeckt. Ihr nächstes Abenteuer ist nur einen Klick entfernt.',
    browseAllTours: 'Alle Touren ansehen',
    getExpertAdvice: 'Beratung anfragen',
    maxGroup: (size) => `Max. ${size} Personen`,
    tourReviews: (count) => plural(count, 'Bewertung', 'Bewertungen'),
    showLessTitle: 'Weniger anzeigen',
    viewAllReviews: (count) => `Alle ${count} Bewertungen ansehen`,
    showingOf: (shown, total) => `${shown} von ${total} Touren`,
    categoriesRoot: 'Kategorien',
  },
  fr: {
    dateLocale: 'fr-FR',
    attractionsRoot: 'Sites à visiter',
    popularAttraction: 'Site incontournable',
    reviewsCount: (count) => plural(count, 'avis', 'avis'),
    activitiesCount: (count) => plural(count, 'activité', 'activités'),
    whatToExpect: 'Au programme',
    showLess: 'Afficher moins',
    readMore: 'Lire la suite',
    searchActivities: 'Rechercher une activité…',
    sortMostPopular: 'Les plus populaires',
    sortPriceLow: 'Prix croissant',
    sortPriceHigh: 'Prix décroissant',
    sortTopRated: 'Les mieux notées',
    sortDuration: 'Durée',
    sortNewest: 'Les plus récentes',
    gridView: 'Affichage en grille',
    listView: 'Affichage en liste',
    reviewsTitle: 'Avis des voyageurs',
    reviewsSubtitle: 'Ce que les autres pensent de leur expérience',
    anonymous: 'Anonyme',
    showAllReviews: (count) => `Voir les ${count} avis`,
    gallery: 'Galerie photos',
    whatMakesThisSpecial: 'Ce qui rend ce lieu unique',
    availableActivities: 'Activités disponibles',
    resultsCount: (count) => plural(count, 'résultat', 'résultats'),
    noActivitiesFound: 'Aucune activité trouvée',
    tryAdjustingSearch: 'Essayez une autre recherche',
    checkBackSoon: 'De nouvelles activités arrivent bientôt',
    clearSearch: 'Effacer la recherche',
    travelTips: 'Conseils de voyage',
    faqTitle: 'Questions fréquentes',
    similarAttractions: 'Sites similaires',
    similarAttractionsSubtitle: 'D’autres lieux qui pourraient vous plaire',
    topExperiences: 'Expériences à ne pas manquer',
    topExperiencesSubtitle: 'Les activités préférées des voyageurs',
    readyToExplore: (title) => `Prêt à découvrir ${title} ?`,
    bookNowMemories: 'Réservez maintenant et créez des souvenirs inoubliables',
    viewAllActivities: 'Voir toutes les activités',
    contactUs: 'Nous contacter',
    searchTours: 'Rechercher une excursion…',
    sortFeaturedFirst: 'Recommandées d’abord',
    sortHighestRated: 'Les mieux notées',
    sortNewestFirst: 'Les plus récentes',
    filters: 'Filtres',
    featured: 'Recommandée',
    toursAvailable: 'Excursions disponibles',
    customerReviews: 'Avis clients',
    averageRating: 'Note moyenne',
    whyThousandsChooseUs: 'Pourquoi des milliers de voyageurs nous choisissent',
    customersSay: 'Ce que disent nos clients',
    customersSaySubtitle: 'Les avis de voyageurs qui ont fait ces excursions',
    whyChooseThisExperience: 'Pourquoi choisir cette expérience',
    whatMakesThisSpecialTitle: 'Ce qui la rend unique',
    noToursFound: 'Aucune excursion trouvée',
    tryAdjustingCriteria: 'Modifiez vos critères ou parcourez toutes les excursions.',
    clearSearchTitle: 'Effacer la recherche',
    relatedGuides: 'Guides et sélections associés',
    readyToStart: 'Prêt pour l’aventure ?',
    readyToStartBody: 'Des milliers de voyageurs ont déjà vécu des expériences inoubliables avec nous. Votre prochaine aventure est à portée de clic.',
    browseAllTours: 'Voir toutes les excursions',
    getExpertAdvice: 'Demander conseil',
    maxGroup: (size) => `${size} pers. max.`,
    tourReviews: (count) => plural(count, 'avis', 'avis'),
    showLessTitle: 'Afficher moins',
    viewAllReviews: (count) => `Voir les ${count} avis`,
    showingOf: (shown, total) => `${shown} excursions sur ${total}`,
    categoriesRoot: 'Catégories',
  },
  es: {
    dateLocale: 'es-ES',
    attractionsRoot: 'Lugares de interés',
    popularAttraction: 'Lugar destacado',
    reviewsCount: (count) => plural(count, 'reseña', 'reseñas'),
    activitiesCount: (count) => plural(count, 'actividad', 'actividades'),
    whatToExpect: 'Qué te espera',
    showLess: 'Mostrar menos',
    readMore: 'Leer más',
    searchActivities: 'Buscar actividades…',
    sortMostPopular: 'Más populares',
    sortPriceLow: 'Precio: de menor a mayor',
    sortPriceHigh: 'Precio: de mayor a menor',
    sortTopRated: 'Mejor valoradas',
    sortDuration: 'Duración',
    sortNewest: 'Más recientes',
    gridView: 'Vista de cuadrícula',
    listView: 'Vista de lista',
    reviewsTitle: 'Opiniones de viajeros',
    reviewsSubtitle: 'Lo que cuentan otros viajeros de su experiencia',
    anonymous: 'Anónimo',
    showAllReviews: (count) => `Ver las ${count} reseñas`,
    gallery: 'Galería de fotos',
    whatMakesThisSpecial: 'Qué hace especial este lugar',
    availableActivities: 'Actividades disponibles',
    resultsCount: (count) => plural(count, 'resultado', 'resultados'),
    noActivitiesFound: 'No hay actividades',
    tryAdjustingSearch: 'Prueba con otra búsqueda',
    checkBackSoon: 'Pronto habrá nuevas actividades',
    clearSearch: 'Borrar búsqueda',
    travelTips: 'Consejos de viaje',
    faqTitle: 'Preguntas frecuentes',
    similarAttractions: 'Lugares similares',
    similarAttractionsSubtitle: 'Otros sitios que te pueden gustar',
    topExperiences: 'Experiencias imprescindibles',
    topExperiencesSubtitle: 'Las actividades favoritas de los viajeros',
    readyToExplore: (title) => `¿Listo para descubrir ${title}?`,
    bookNowMemories: 'Reserva ahora y vive recuerdos inolvidables',
    viewAllActivities: 'Ver todas las actividades',
    contactUs: 'Contacto',
    searchTours: 'Buscar excursiones…',
    sortFeaturedFirst: 'Destacadas primero',
    sortHighestRated: 'Mejor valoradas',
    sortNewestFirst: 'Más recientes',
    filters: 'Filtros',
    featured: 'Destacada',
    toursAvailable: 'Excursiones disponibles',
    customerReviews: 'Reseñas de clientes',
    averageRating: 'Valoración media',
    whyThousandsChooseUs: 'Por qué miles de viajeros nos eligen',
    customersSay: 'Lo que dicen nuestros clientes',
    customersSaySubtitle: 'Reseñas de viajeros que han hecho estas excursiones',
    whyChooseThisExperience: 'Por qué elegir esta experiencia',
    whatMakesThisSpecialTitle: 'Qué la hace especial',
    noToursFound: 'No hay excursiones',
    tryAdjustingCriteria: 'Cambia los criterios de búsqueda o mira todas las excursiones.',
    clearSearchTitle: 'Borrar búsqueda',
    relatedGuides: 'Guías y colecciones relacionadas',
    readyToStart: '¿Listo para tu aventura?',
    readyToStartBody: 'Miles de viajeros ya han vivido experiencias increíbles con nosotros. Tu próxima aventura está a un clic.',
    browseAllTours: 'Ver todas las excursiones',
    getExpertAdvice: 'Pedir consejo',
    maxGroup: (size) => `Máx. ${size} personas`,
    tourReviews: (count) => plural(count, 'reseña', 'reseñas'),
    showLessTitle: 'Mostrar menos',
    viewAllReviews: (count) => `Ver las ${count} reseñas`,
    showingOf: (shown, total) => `${shown} de ${total} excursiones`,
    categoriesRoot: 'Categorías',
  },
};

export function attractionTemplateCopyFor(locale: string): AttractionTemplateCopy {
  const language = locale.slice(0, 2) as keyof typeof ATTRACTION_TEMPLATE_COPY;
  return ATTRACTION_TEMPLATE_COPY[language] ?? ATTRACTION_TEMPLATE_COPY.en;
}

export function useAttractionTemplateCopy(): AttractionTemplateCopy {
  return attractionTemplateCopyFor(useLocale());
}
