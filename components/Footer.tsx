'use client';

import React, { useState, useEffect } from "react";
import { ArrowUpRight, Facebook, Instagram, Twitter, Youtube, Phone, Mail, MessageSquare, Loader2, ScanLine, X, Smartphone } from "lucide-react";
import QRCode from 'qrcode';
import Image from "next/image";
import { Link } from '@/i18n/routing';
import { useNavData } from '@/contexts/NavDataContext';
import toast from 'react-hot-toast';
import { useLocale, useTranslations } from 'next-intl';
import { isRTL } from '@/i18n/config';
import { requestHostedAISearch } from '@/lib/hostedAISearch';
import {OFFICIAL_SOCIAL_LINKS} from '@/lib/config/socialLinks';

// Import the single, consolidated switcher component
import CurrencyLanguageSwitcher from '@/components/shared/CurrencyLanguageSwitcher';
import InternalLinkBlock from '@/components/navigation/InternalLinkBlock';
import { contentPath } from '@/lib/content/contentUrl';

// =================================================================
// --- FOOTER-SPECIFIC DATA ---
// =================================================================
const socialLinks = [
  { icon: Facebook, href: OFFICIAL_SOCIAL_LINKS.facebook },
  { icon: Instagram, href: OFFICIAL_SOCIAL_LINKS.instagram },
  { icon: Twitter, href: OFFICIAL_SOCIAL_LINKS.twitter },
  { icon: Youtube, href: OFFICIAL_SOCIAL_LINKS.youtube },
];

const PaymentIcons = {
  Visa: () => <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><rect width="40" height="24" rx="4" fill="white" stroke="#dadce0" /><text x="20" y="16" textAnchor="middle" fill="#1A1F71" fontSize="10" fontWeight="bold">VISA</text></svg>,
  Mastercard: () => <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><rect width="40" height="24" rx="4" fill="white" stroke="#dadce0" /><circle cx="16" cy="12" r="6" fill="#FF5F00" /><circle cx="24" cy="12" r="6" fill="#EB001B" fillOpacity="0.8" /></svg>,
  Amex: () => <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><rect width="40" height="24" rx="4" fill="#006FCF" /><text x="20" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">AMEX</text></svg>,
};

const paymentMethods = [
  { name: "Visa", component: PaymentIcons.Visa },
  { name: "Mastercard", component: PaymentIcons.Mastercard },
  { name: "Amex", component: PaymentIcons.Amex },
];

// =================================================================
// --- FOOTER COMPONENT ---
// =================================================================
export default function Footer() {
  const { destinations, categories } = useNavData();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'idle' | 'pending' | 'confirmed'>('idle');
  const [showAppModal, setShowAppModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const t = useTranslations('footer');
  const locale = useLocale();
  const rtl = isRTL(locale);
  const appLandingPath = locale === 'en' ? '/mobile-app' : `/${locale}/mobile-app`;
  const appLandingUrl = `https://egypt-excursionsonline.com${appLandingPath}`;
  const appLandingLabel = appLandingUrl.replace(/^https?:\/\//, '');

  // Generate QR code for the dedicated app landing page.
  useEffect(() => {
    let isMounted = true;

    QRCode.toDataURL(appLandingUrl, {
      width: 200,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then((dataUrl) => {
        if (isMounted) setQrDataUrl(dataUrl);
      })
      .catch(console.error);

    return () => {
      isMounted = false;
    };
  }, [appLandingUrl]);

  // Close modal on Escape key
  useEffect(() => {
    if (!showAppModal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowAppModal(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showAppModal]);

  const handleSubscribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error(t('invalidEmail'));
      return;
    }
    if (!newsletterConsent) {
      toast.error(t('newsletterConsentRequired'));
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, source: 'footer', consent: true }),
      });

      const data = await response.json();

      if (response.ok) {
        const nextStatus = data.status === 'confirmed' ? 'confirmed' : 'pending';
        toast.success(nextStatus === 'confirmed' ? t('subscribeSuccess') : t('newsletterPendingDesc'));
        setEmail('');
        setNewsletterConsent(false);
        setSubscriptionStatus(nextStatus);
      } else {
        toast.error(data.error || t('subscribeFailed'));
      }
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error(t('subscribeError'));
    } finally {
      setIsLoading(false);
    }
  };

  const openChatbot = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    requestHostedAISearch({
      query: '',
      mode: 'ai',
      locale,
    });
  };

  return (
    <>
    <InternalLinkBlock />
    <footer className="bg-white text-slate-700 pb-20 md:pb-24">
      <div className="container mx-auto px-4 py-12">

        {/* App Download Banner */}
        <section aria-labelledby="app-launch-title" className="relative mb-8 overflow-hidden rounded-[2rem] border border-slate-200 bg-white text-slate-900 shadow-[0_28px_70px_-46px_rgba(15,23,42,0.3)] sm:rounded-[2.25rem]">
          <div className="absolute inset-0 bg-white" />

          <div className="relative grid lg:min-h-[560px] lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)] lg:items-stretch">
            <div className="relative z-10 flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-12 lg:px-12 lg:py-14 xl:px-14">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2.5 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">{t('comingSoon')}</span>
                </div>
              </div>

              <div className="max-w-2xl">
                <h3 id="app-launch-title" className="max-w-2xl text-[clamp(2.35rem,4.5vw,3.8rem)] font-extrabold leading-[1.06] tracking-[-0.035em] text-slate-950">
                  {t('getTheApp')}
                </h3>
                <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                  {t('getTheAppDesc')}
                </p>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="inline-flex min-h-12 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 px-5 py-3 text-sm font-bold text-rose-700">
                  <span>{t('launchingOn')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAppModal(true)}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-950 bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
                >
                  <ScanLine size={17} />
                  <span>{t('scanToDownload')}</span>
                </button>
              </div>

              <div className="mt-7 grid w-full max-w-lg grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAppModal(true)}
                  className="group relative overflow-hidden rounded-xl border border-slate-900 bg-slate-950 p-3 text-left transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 sm:p-3.5"
                >
                  <div className="relative flex items-center gap-2.5 sm:gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-950 sm:h-11 sm:w-11">
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" className="shrink-0">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">{t('downloadOn')}</span>
                      <span className="mt-0.5 block text-lg font-bold tracking-tight text-white">App Store</span>
                    </div>
                    <ArrowUpRight size={16} className="hidden text-white/40 sm:block" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAppModal(true)}
                  className="group relative overflow-hidden rounded-xl border border-slate-900 bg-slate-950 p-3 text-left transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 sm:p-3.5"
                >
                  <div className="relative flex items-center gap-2.5 sm:gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white sm:h-11 sm:w-11">
                      <svg viewBox="0 0 24 24" width="24" height="24" className="shrink-0">
                        <path d="M3.18 23.67c-.38-.4-.56-.96-.56-1.68V2.01c0-.72.18-1.28.56-1.68l.1-.1L14.7 11.65v.26L3.28 23.57l-.1-.1z" fill="#4285F4" />
                        <path d="M18.54 15.79l-3.84-3.84v-.26l3.84-3.84.08.05 4.56 2.59c1.3.74 1.3 1.95 0 2.69l-4.56 2.59-.08.02z" fill="#FBBC04" />
                        <path d="M18.62 15.77L14.7 11.78 3.18 23.67c.43.46 1.14.51 1.96.06l13.48-7.96" fill="#EA4335" />
                        <path d="M18.62 7.85L5.14.27C4.32-.18 3.61-.13 3.18.33l11.52 11.45 3.92-3.93z" fill="#34A853" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">{t('getItOn')}</span>
                      <span className="mt-0.5 block text-lg font-bold tracking-tight text-white">Google Play</span>
                    </div>
                    <ArrowUpRight size={16} className="hidden text-white/40 sm:block" />
                  </div>
                </button>
              </div>
            </div>

            <div className="relative hidden min-h-[380px] items-center justify-center overflow-hidden border-t border-slate-200 bg-slate-50 sm:flex lg:min-h-full lg:border-s lg:border-t-0">
              <div className="relative z-10 w-full px-4 py-8 sm:px-6 sm:py-10">
                <div className="mx-auto grid max-w-[440px] items-center gap-4 sm:grid-cols-[150px_minmax(0,1fr)]">
                  <div className="order-2 hidden sm:order-1 sm:block">
                    <div className="mx-auto w-fit rounded-[1.25rem] border border-slate-200 bg-white p-2 shadow-sm">
                      <div className="rounded-[0.9rem] bg-white p-2.5">
                        {qrDataUrl ? (
                          <Image src={qrDataUrl} alt="Scan to download app" width={120} height={120} className="rounded-xl" />
                        ) : (
                          <div className="h-[120px] w-[120px] animate-pulse rounded-xl bg-slate-100" />
                        )}
                      </div>
                    </div>
                    <div className="mt-3 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">{t('scanToDownload')}</p>
                      {appLandingLabel ? (
                        <p className="mt-2 truncate text-xs text-slate-400">{appLandingLabel}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="order-1 flex justify-center sm:order-2 sm:justify-end">
                    <div className="relative h-[300px] w-[184px] sm:h-[390px] sm:w-[232px]">
                      <div className="absolute inset-0 rounded-[2.5rem] bg-slate-950 shadow-[0_30px_60px_-28px_rgba(15,23,42,0.55)] ring-1 ring-slate-300" />
                      <div className="absolute left-1/2 top-0 z-20 h-7 w-24 -translate-x-1/2 rounded-b-3xl bg-slate-950" />
                      <div className="absolute inset-[5px] overflow-hidden rounded-[2.15rem] bg-[linear-gradient(180deg,#0f172a_0%,#1e293b_56%,#020617_100%)]">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.16),_transparent_34%)]" />
                        <div className="flex items-center justify-between px-5 pb-3 pt-8">
                          <span className="text-[10px] font-semibold tracking-[0.18em] text-white/75">9:41</span>
                          <div className="flex gap-1">
                            <div className="h-1.5 w-3 rounded-sm bg-white/55" />
                            <div className="h-1.5 w-1.5 rounded-full bg-white/55" />
                          </div>
                        </div>
                        <div className="space-y-3 px-4">
                          <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 backdrop-blur">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
                              <Smartphone size={15} className="text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="h-2 w-16 rounded-full bg-white/30" />
                              <div className="mt-2 h-1.5 w-12 rounded-full bg-white/15" />
                            </div>
                          </div>
                          <div className="rounded-[1.35rem] border border-white/10 bg-white/10 p-3 backdrop-blur">
                            <div className="mb-3 h-20 rounded-[1rem] bg-white/10" />
                            <div className="h-2 w-24 rounded-full bg-white/30" />
                            <div className="mt-2 h-2 w-16 rounded-full bg-white/15" />
                            <div className="mt-4 flex items-center justify-between">
                              <div className="flex gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <svg key={i} className="h-2.5 w-2.5 text-amber-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                                ))}
                              </div>
                              <div className="h-6 w-14 rounded-full bg-white/20" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-[1.1rem] border border-white/10 bg-white/10 p-3 backdrop-blur">
                              <div className="h-9 rounded-xl bg-white/10" />
                              <div className="mt-3 h-1.5 w-12 rounded-full bg-white/20" />
                            </div>
                            <div className="rounded-[1.1rem] border border-white/10 bg-white/10 p-3 backdrop-blur">
                              <div className="h-9 rounded-xl bg-white/10" />
                              <div className="mt-3 h-1.5 w-12 rounded-full bg-white/20" />
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Footer Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-6 mb-6 items-start bg-slate-50 border border-slate-100 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.2)]">

          {/* Column 1: Brand Info, Trust Badge & Payment Methods */}
          <div className="space-y-6 lg:col-span-2">
            <Link href="/" className="inline-block">
              <Image
                src="/EEO-logo.png"
                alt="Egypt Excursions Online"
                width={160}
                height={80}
                className="h-16 sm:h-20 w-auto object-contain"
              />
            </Link>
            <p className="text-sm text-slate-600 leading-relaxed max-w-xs">
              {t('tagline')}
            </p>

            {/* Trusted by clients */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <p className="font-semibold text-slate-900 mb-3 text-base">{t('trustedBy')}</p>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl font-bold text-slate-900 leading-none">4.9</span>
                <div className="flex text-xl leading-none text-red-500">
                  <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
              </div>
              <p className="text-sm text-slate-500">{t('averageRating')}</p>
            </div>

            {/* Payment Methods */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h3 className="font-bold text-base mb-4 text-slate-900">{t('waysToPlay')}</h3>
              <div className="grid grid-cols-3 gap-2.5">
                {paymentMethods.map((method, idx) => (
                  <div
                    key={idx}
                    title={method.name}
                    className="flex items-center justify-center rounded-md border border-slate-200 bg-white p-2 hover:shadow-sm transition-shadow aspect-[5/3]"
                  >
                    <method.component />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Things To Do */}
          <div className="space-y-4">
            <h3 className="font-semibold text-base lg:text-lg text-slate-900 tracking-wide">{t('thingsToDo')}</h3>
            <ul className="space-y-2 text-sm text-slate-500">
              {categories.slice(0, 5).map((category) => (
                <li key={category._id}>
                  <Link 
                    className="hover:text-red-600 transition-colors inline-flex items-center gap-2" 
                    href={contentPath('category', category.slug, category.urlType, null, category.parentPage?.slug)}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Destinations & Company Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-base lg:text-lg text-slate-900 tracking-wide">{t('destinations')}</h3>
            <ul className="space-y-2 text-sm text-slate-500">
              {destinations.slice(0, 5).map((destination) => (
                <li key={destination._id}>
                  <Link 
                    className="hover:text-red-600 transition-colors inline-flex items-center gap-2" 
                    href={contentPath('destination', destination.slug, destination.urlType, null, destination.parentPage?.slug)}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    {destination.name}
                  </Link>
                </li>
              ))}
            </ul>
            
            <div className="mt-6">
              <h3 className="font-semibold text-base lg:text-lg text-slate-900 tracking-wide">{t('toursTickets')}</h3>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link className="hover:text-red-600 transition-colors inline-flex items-center gap-2" href="/contact"><span className="h-1.5 w-1.5 rounded-full bg-slate-500" />{t('contact')}</Link></li>
                <li><Link className="hover:text-red-600 transition-colors inline-flex items-center gap-2" href="/about"><span className="h-1.5 w-1.5 rounded-full bg-slate-500" />{t('aboutUs')}</Link></li>
                <li><Link className="hover:text-red-600 transition-colors inline-flex items-center gap-2" href="/blog"><span className="h-1.5 w-1.5 rounded-full bg-slate-500" />{t('blog')}</Link></li>
                <li><Link className="hover:text-red-600 transition-colors inline-flex items-center gap-2" href="/faqs"><span className="h-1.5 w-1.5 rounded-full bg-slate-500" />{t('faq')}</Link></li>
                <li><Link className="hover:text-red-600 transition-colors inline-flex items-center gap-2" href="/careers"><span className="h-1.5 w-1.5 rounded-full bg-slate-500" />{t('careers')}</Link></li>
              </ul>
            </div>
          </div>

          {/* Column 4: Contact, Newsletter & Social Media */}
          <div className="space-y-6 lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h3 className="font-semibold text-base lg:text-lg mb-4 text-slate-900 tracking-wide">{t('contactInfo')}</h3>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex gap-3">
                  <span className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center text-red-600"><Phone size={18} /></span>
                  <div className={`flex flex-col ${rtl ? 'text-right' : 'text-left'}`}>
                    <a href="tel:+201142255624" className="font-semibold text-slate-900 hover:text-red-600 transition-colors">
                      <bdi dir="ltr">+20 11 42255624</bdi>
                    </a>
                    <span className="text-xs text-slate-500">{t('support247')}</span>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center text-red-600"><Mail size={18} /></span>
                  <div>
                    <a href="mailto:booking@egypt-excursionsonline.com" className="font-semibold text-slate-900 hover:text-red-600 transition-colors break-all">
                      booking@egypt-excursionsonline.com
                    </a>
                    <p className="text-xs text-slate-500">{t('repliesWithinHour')}</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><MessageSquare size={18} /></span>
                  <button
                    type="button"
                    onClick={openChatbot}
                    className="text-sm font-semibold text-slate-900 hover:text-red-600 transition-colors cursor-pointer text-left"
                    aria-label="Open AI trip assistant"
                  >
                    {t('chatWithUs')}
                  </button>
                </li>
              </ul>
            </div>

            {/* Newsletter */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              {subscriptionStatus === 'idle' ? (
                <>
                  <h4 className="font-semibold text-base mb-2 text-slate-900">{t('newsletter')}</h4>
                  <p className="text-xs text-slate-500 mb-3">{t('newsletterDesc')}</p>
                  <form onSubmit={handleSubscribe} className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('emailPlaceholder')}
                        aria-label={t('emailPlaceholder')}
                        className="w-full sm:flex-1 h-11 rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 bg-white shadow-sm"
                        disabled={isLoading}
                        autoComplete="email"
                        required
                      />
                      <button
                        type="submit"
                        className="flex h-11 w-full items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
                        disabled={isLoading || !newsletterConsent}
                      >
                        {isLoading ? <Loader2 className="animate-spin" aria-hidden="true" /> : t('subscribe')}
                      </button>
                    </div>
                    <label className="flex items-start gap-2 text-[11px] leading-4 text-slate-600">
                      <input
                        type="checkbox"
                        checked={newsletterConsent}
                        onChange={(event) => setNewsletterConsent(event.target.checked)}
                        disabled={isLoading}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-red-600 focus:ring-red-600"
                      />
                      <span>
                        {t('newsletterConsentLabel')}{' '}
                        <Link href="/privacy" className="font-semibold text-slate-800 underline underline-offset-2 hover:text-red-600">
                          {t('privacyPolicy')}
                        </Link>
                      </span>
                    </label>
                  </form>
                </>
              ) : (
                <div className="text-center py-4">
                  <h4 className="font-bold text-sm mb-2 text-green-600">
                    {subscriptionStatus === 'confirmed' ? t('newsletterThanksTitle') : t('newsletterPendingTitle')}
                  </h4>
                  <p className="text-sm text-slate-600">
                    {subscriptionStatus === 'confirmed' ? t('newsletterThanksDesc') : t('newsletterPendingDesc')}
                  </p>
                </div>
              )}
            </div>
            
            {/* Social Media */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h4 className="font-semibold text-base mb-2 text-slate-900">{t('followUs')}</h4>
              <p className="text-xs text-slate-500 mb-3">{t('socialDesc')}</p>
              <div className="flex gap-3">
                {socialLinks.map(({ icon: Icon, href }, i) => (
                  <a
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-600 transition-colors hover:bg-red-600 hover:text-white"
                    aria-label={t('followSocialAria')}
                  >
                    <Icon size={18} />
                  </a>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Currency/Language Switcher */}
        <div className="border-t border-slate-300 pt-4 mb-4">
          <CurrencyLanguageSwitcher variant="footer" />
        </div>

        {/* Legal Footer */}
        <div className="border-t border-slate-300 pt-4 text-xs text-slate-500 text-center" dir={rtl ? 'rtl' : 'ltr'}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-3">
            <Link className="underline hover:text-slate-700 transition-colors" href="/privacy">{t('privacyPolicy')}</Link>
            <span className="hidden sm:inline">·</span>
            <Link className="underline hover:text-slate-700 transition-colors" href="/terms">{t('termsConditions')}</Link>
          </div>
          <p>
            © {new Date().getFullYear()} <bdi dir="ltr">Egypt Excursions Online</bdi>. {t('copyright')}
          </p>
        </div>
      </div>

      {/* Coming Soon Modal */}
      {showAppModal && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-md sm:items-center sm:p-4"
            onClick={() => setShowAppModal(false)}
          >
            <div
              className="relative max-h-[calc(100vh-1rem)] w-full max-w-sm overflow-y-auto rounded-[2rem] bg-white shadow-2xl sm:max-h-[calc(100vh-2rem)] sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header gradient */}
              <div className="relative overflow-hidden bg-red-50 px-6 pb-12 pt-8 text-center sm:px-8 sm:pb-14 sm:pt-10">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(244,63,94,0.16)_0%,_transparent_60%)]" />
                <button
                  type="button"
                  onClick={() => setShowAppModal(false)}
                  className="absolute right-4 top-4 text-slate-400 transition-colors hover:text-slate-700"
                  aria-label="Close"
                >
                  <X size={20} />
              </button>

              <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-200 bg-white/90 shadow-sm backdrop-blur-sm">
                <Smartphone size={28} className="text-rose-700" />
              </div>

              <h3 className="relative text-2xl font-extrabold tracking-tight text-slate-900">{t('comingSoon')}</h3>
              <p className="relative mt-3 inline-flex rounded-full border border-rose-200 bg-white/85 px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm">
                {t('launchingOn')}
              </p>
            </div>

            {/* Modal body */}
              <div className="relative -mt-6 px-5 pb-6 sm:px-8 sm:pb-8">
                {/* QR code card floating above the fold */}
                <div className="mb-6 flex flex-col items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-lg sm:flex-row sm:text-left">
                  <div className="shrink-0 bg-slate-50 rounded-xl p-2">
                    {qrDataUrl ? (
                      <Image src={qrDataUrl} alt="QR code" width={72} height={72} className="rounded-lg" />
                  ) : (
                    <div className="w-[72px] h-[72px] bg-slate-100 rounded-lg animate-pulse" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-0.5">{t('scanToDownload')}</p>
                  <p className="text-xs text-slate-500 leading-relaxed break-all">{appLandingLabel}</p>
                </div>
              </div>

              <p className="text-sm text-slate-500 leading-relaxed text-center mb-6">{t('comingSoonDesc')}</p>

              <button
                type="button"
                onClick={() => setShowAppModal(false)}
                className="w-full h-12 rounded-xl text-white bg-slate-900 hover:bg-slate-800 transition-colors text-sm font-semibold shadow-sm"
              >
                {t('gotIt')}
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
    </>
  );
}
