import { Link } from '@/i18n/routing';
import Image from 'next/image';
import { Destination } from '@/types';
import { getLocale, getTranslations } from 'next-intl/server';
import { isRTL } from '@/i18n/config';

interface DestinationWithTourCount extends Destination {
  tourCount: number;
}

interface DestinationsServerProps {
  destinations: DestinationWithTourCount[];
}

export default async function DestinationsServer({ destinations }: DestinationsServerProps) {
  const t = await getTranslations('destinations');
  const locale = await getLocale();
  const rtl = isRTL(locale);
  const numberFormatter = new Intl.NumberFormat(locale);

  if (!destinations || destinations.length === 0) {
    return null;
  }

  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mb-6 sm:mb-8 text-center sm:text-start">
          {t('title')}
        </h2>
        <div className="flex justify-center gap-4 sm:gap-6 md:gap-8 flex-wrap">
          {destinations.map((destination) => {
            const tourCount = destination.tourCount || 0;
            const tourLabel = tourCount !== 1 ? t('tours') : t('tour');
            const formattedCount = numberFormatter.format(tourCount);
            const tourCountText = rtl ? `${tourLabel} ${formattedCount}` : `${formattedCount} ${tourLabel}`;

            return (
              <Link
                key={destination._id}
                href={`/destinations/${destination.slug}`}
                className="text-center group"
              >
                <div className="relative w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full overflow-hidden shadow-lg transform transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl bg-slate-200">
                  {destination.image && destination.image !== 'UPLOAD_IMAGE_URL_HERE' && (
                    <Image
                      src={destination.image}
                      alt={destination.name}
                      width={160}
                      height={160}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors"></div>
                </div>
                <h3 className="mt-3 sm:mt-4 font-bold text-base sm:text-lg text-slate-800 group-hover:text-red-500 transition-colors">
                  {destination.name}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500" dir={rtl ? 'rtl' : 'ltr'}>
                  {tourCountText}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
