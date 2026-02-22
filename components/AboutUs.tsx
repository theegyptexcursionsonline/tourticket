'use client';

import { ArrowLeft, ArrowRight, Award, DollarSign, Smartphone, CalendarCheck } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { isRTL } from '@/i18n/config';

export default function WhyBookWithUs() {
  const t = useTranslations('about');
  const locale = useLocale();
  const rtl = isRTL(locale);
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  return (
    <section className="bg-slate-50 py-12 sm:py-16 md:py-20 lg:py-24">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 md:gap-12 lg:gap-16 items-center">
          {/* Left Column: Text Content */}
          <div className="order-2 lg:order-1">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-3 tracking-tight">
              {t('title')}
            </h2>
            <p className="text-base sm:text-lg text-slate-600 mb-8 sm:mb-10 max-w-lg">
              {t('subtitle')}
            </p>

            <ul className="space-y-4 sm:space-y-5 md:space-y-6 mb-8 sm:mb-10">
              <li className="flex items-start">
                <Award className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 mr-3 sm:mr-4 flex-shrink-0 mt-0.5" />
                <span className="text-base sm:text-lg font-medium text-slate-800 leading-tight">
                  {t('partner')}
                </span>
              </li>
              <li className="flex items-start">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 mr-3 sm:mr-4 flex-shrink-0 mt-0.5" />
                <span className="text-base sm:text-lg font-medium text-slate-800 leading-tight">
                  {t('bestPrice')}
                </span>
              </li>
              <li className="flex items-start">
                <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 mr-3 sm:mr-4 flex-shrink-0 mt-0.5" />
                <span className="text-base sm:text-lg font-medium text-slate-800 leading-tight">
                  {t('mobileTicket')}
                </span>
              </li>
              <li className="flex items-start">
                <CalendarCheck className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 mr-3 sm:mr-4 flex-shrink-0 mt-0.5" />
                <span className="text-base sm:text-lg font-medium text-slate-800 leading-tight">
                  {t('freeCancellation')}
                </span>
              </li>
            </ul>

            {/* CTA - rounded full button */}
            <a
              href="/about"
              className="inline-flex items-center gap-2 sm:gap-3 px-6 sm:px-8 md:px-10 py-3 sm:py-4 rounded-full bg-gradient-to-r from-red-600 to-red-700 text-white text-sm sm:text-base font-semibold shadow-xl hover:scale-[1.03] transition-all duration-300 group"
            >
              <span>{t('cta')}</span>
              <Arrow className="w-4 sm:w-5 h-4 sm:h-5 flex-shrink-0" />
            </a>
          </div>

          {/* Right Column: Image */}
          <div className="order-1 lg:order-2 relative w-full h-[300px] sm:h-[400px] md:h-[450px] lg:h-[500px] rounded-2xl overflow-hidden shadow-xl">
            <Image
              src="/about.png" // replace with Egypt/Nile related image
              alt="A scenic view of a popular travel destination"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
