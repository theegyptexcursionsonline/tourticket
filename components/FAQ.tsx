'use client';

import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { isRTL } from '@/i18n/config';

interface FaqDataItem {
    question: string;
    answer: string;
}

const FaqItem = ({ item, rtl }: { item: FaqDataItem; rtl: boolean }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-slate-200 py-4 sm:py-5 md:py-6 group">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex justify-between items-start gap-3 sm:gap-4 hover:text-red-600 transition-colors ${rtl ? 'text-right' : 'text-left'}`}
                aria-expanded={isOpen}
            >
                <h3 className="text-base sm:text-lg font-semibold text-slate-800 group-hover:text-red-600 transition-colors flex-1">{item.question}</h3>
                {isOpen ? (
                    <Minus className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 transition-transform duration-300 transform rotate-180 flex-shrink-0 mt-0.5" />
                ) : (
                    <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500 transition-transform duration-300 flex-shrink-0 mt-0.5" />
                )}
            </button>
            <div
                className={`grid transition-all duration-500 ease-in-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100 pt-3 sm:pt-4' : 'grid-rows-[0fr] opacity-0'
                }`}
            >
                <div className="overflow-hidden">
                    <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                        {item.answer}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default function FAQ() {
    const t = useTranslations('faq');
    const locale = useLocale();
    const rtl = isRTL(locale);
    const faqData = t.raw('items');
    const faqItems: FaqDataItem[] = Array.isArray(faqData) ? faqData : [];

    return (
        <section className="bg-white py-12 sm:py-16 md:py-20 font-sans" dir={rtl ? 'rtl' : 'ltr'}>
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-8 sm:mb-10">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight px-4">
                        {t('title')}
                    </h2>
                </div>
                <div className="space-y-3 sm:space-y-4">
                    {faqItems.map((item, index) => (
                        <FaqItem key={index} item={item} rtl={rtl} />
                    ))}
                </div>
                <div className="text-center mt-8 sm:mt-10 md:mt-12">
                    <Link
                      href="/faqs"
                      className="inline-flex justify-center items-center h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base font-bold text-red-600 border-2 border-red-600 hover:bg-red-600 hover:text-white transition-all duration-300 ease-in-out rounded-full"
                      role="button"
                      aria-label={t('viewAllAria')}
                    >
                        {t('viewAll')}
                    </Link>
                </div>
            </div>
        </section>
    );
}
