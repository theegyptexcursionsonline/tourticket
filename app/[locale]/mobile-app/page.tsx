import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowRight, BellRing, CalendarDays, CheckCircle2, Smartphone, Ticket } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Link } from '@/i18n/routing';

export const revalidate = 60;

interface MobileAppPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: MobileAppPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'mobileAppPage' });

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'website',
    },
  };
}

export default async function MobileAppPage({ params }: MobileAppPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'mobileAppPage' });
  const footerT = await getTranslations({ locale, namespace: 'footer' });

  return (
    <>
      <Header startSolid />
      <main className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#fff7f5_0%,#ffffff_28%,#fffdf8_100%)] pb-32 pt-24 sm:pt-28">
        <section className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-[2rem] border border-rose-100 bg-white shadow-[0_32px_90px_-42px_rgba(15,23,42,0.3)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(251,113,133,0.16),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(251,191,36,0.12),_transparent_30%)]" />
            <div className="relative grid gap-10 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-12 lg:py-14">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm">
                  <Smartphone size={16} />
                  <span>{t('eyebrow')}</span>
                </div>

                <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                  {t('heroTitle')}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                  {t('heroDescription')}
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">
                    <CalendarDays size={16} />
                    <span>{footerT('launchingOn')}</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                    <CheckCircle2 size={16} />
                    <span>{t('officialQr')}</span>
                  </div>
                </div>

                <div className="mt-8 grid gap-3 sm:max-w-xl sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.35)]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      {footerT('downloadOn')}
                    </p>
                    <p className="mt-1 text-xl font-bold text-slate-900">App Store</p>
                    <p className="mt-2 text-sm text-slate-500">{t('storeAvailability')}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.35)]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      {footerT('getItOn')}
                    </p>
                    <p className="mt-1 text-xl font-bold text-slate-900">Google Play</p>
                    <p className="mt-2 text-sm text-slate-500">{t('storeAvailability')}</p>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/tours"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    <span>{t('primaryCta')}</span>
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:border-rose-200 hover:bg-rose-50"
                  >
                    <BellRing size={16} />
                    <span>{t('secondaryCta')}</span>
                  </Link>
                </div>
              </div>

              <div className="grid gap-5">
                <div className="mx-auto w-full max-w-[22rem] rounded-[2rem] border border-white/70 bg-white/80 p-4 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.32)] backdrop-blur-sm">
                  <div className="relative mx-auto h-[23rem] w-[14rem] overflow-hidden rounded-[2.25rem] border border-slate-200 bg-gradient-to-b from-slate-800 to-slate-700 shadow-[0_26px_60px_-30px_rgba(15,23,42,0.4)]">
                    <div className="absolute left-1/2 top-0 z-10 h-6 w-24 -translate-x-1/2 rounded-b-2xl bg-slate-900" />
                    <div className="absolute inset-[4px] overflow-hidden rounded-[1.95rem] bg-gradient-to-b from-rose-400 via-rose-500 to-slate-900">
                      <div className="flex items-center justify-between px-6 pb-2 pt-8">
                        <span className="text-[9px] font-medium text-white/70">9:41</span>
                        <div className="flex gap-1">
                          <div className="h-1.5 w-3 rounded-sm bg-white/55" />
                          <div className="h-1.5 w-1.5 rounded-full bg-white/55" />
                        </div>
                      </div>
                      <div className="space-y-3 px-4 pt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                            <Smartphone size={14} className="text-white" />
                          </div>
                          <div className="h-2 w-16 rounded-full bg-white/30" />
                        </div>
                        <div className="h-2.5 w-28 rounded-full bg-white/20" />
                        <div className="h-2 w-20 rounded-full bg-white/15" />
                        <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-sm">
                          <div className="mb-3 h-20 rounded-xl bg-white/10" />
                          <div className="mb-2 h-2 w-24 rounded-full bg-white/25" />
                          <div className="h-1.5 w-14 rounded-full bg-white/15" />
                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex gap-1">
                              {[...Array(5)].map((_, i) => (
                                <span key={i} className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                              ))}
                            </div>
                            <div className="h-6 w-12 rounded-lg bg-rose-200/80" />
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-sm">
                          <div className="mb-2 h-10 rounded-xl bg-white/10" />
                          <div className="h-2 w-20 rounded-full bg-white/20" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-rose-100 bg-white p-5 shadow-[0_20px_60px_-38px_rgba(15,23,42,0.28)]">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-rose-600">{t('qrTitle')}</p>
                  <p className="mt-3 text-base leading-7 text-slate-600">{t('qrDescription')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.26)]">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                <Ticket size={22} />
              </div>
              <h2 className="text-lg font-bold text-slate-900">{t('featureOneTitle')}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{t('featureOneDesc')}</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.26)]">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <BellRing size={22} />
              </div>
              <h2 className="text-lg font-bold text-slate-900">{t('featureTwoTitle')}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{t('featureTwoDesc')}</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.26)]">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 size={22} />
              </div>
              <h2 className="text-lg font-bold text-slate-900">{t('featureThreeTitle')}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{t('featureThreeDesc')}</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
