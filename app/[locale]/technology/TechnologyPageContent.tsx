'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { Headphones, Search, CreditCard, Smartphone, CheckCircle2, Clock3, AlertCircle, Loader2 } from 'lucide-react';
import { SHOWCASE_CAPABILITIES, STATUS_CACHE_TTL_MS, type CapabilityId } from '@/lib/showcase/registry';
import type { CapabilityObservation, TechnologyStatusPayload } from '@/lib/showcase/status';
import { buildHostedSearchFallbackHref, requestHostedAISearch } from '@/lib/hostedAISearch';

type CapabilityCopy = { title: string; body: string; cta?: string };

type TechnologyCopy = {
  kicker: string;
  title: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta: string;
  statusHeading: string;
  statusIntro: string;
  badgeLive: string;
  badgePreview: string;
  badgeUnavailable: string;
  badgeChecking: string;
  statusError: string;
  unavailableHint: string;
  previewHint: string;
  checkedAt: string;
  capabilities: Record<CapabilityId, CapabilityCopy>;
};

const copy: Record<string, TechnologyCopy> = {
  en: {
    kicker: 'Technology at Egypt Excursions Online',
    title: 'The technology behind your Egypt trip',
    subtitle:
      'Search, ask, book and travel with tools built for the way you plan. Every capability below shows its current status, checked live against our own services.',
    primaryCta: 'Explore tours',
    secondaryCta: 'Try the voice concierge',
    statusHeading: 'What is live today',
    statusIntro:
      'Status is re-checked every minute. If a service does not answer, we say so rather than guess.',
    badgeLive: 'Live',
    badgePreview: 'Preview',
    badgeUnavailable: 'Status unavailable',
    badgeChecking: 'Checking status…',
    statusError:
      'We could not check status just now. Each capability is shown as unavailable until the next check succeeds.',
    unavailableHint: 'This service is not answering right now. The rest of the site works as usual.',
    previewHint: 'Coming soon. Not yet available to download.',
    checkedAt: 'Last checked',
    capabilities: {
      'ai-voice': {
        title: 'AI voice concierge',
        body: 'Talk to Nile about tours, availability, prices and pickups, in English or Arabic. Every answer comes from our real catalogue.',
        cta: 'Talk to Nile',
      },
      'ai-search': {
        title: 'AI trip search',
        body: 'The search bar on every page understands plain questions such as “a half-day in Luxor with a guide” and returns tours you can book, grounded in our live catalogue.',
        cta: 'Ask the trip search',
      },
      'online-booking': {
        title: 'Online booking & secure checkout',
        body: 'Pick a date, choose your options and pay securely by card. Your confirmation and voucher arrive by email, and every booking is visible in your account.',
        cta: 'Browse tours',
      },
      'mobile-apps': {
        title: 'Mobile apps',
        body: 'Our iOS and Android apps for booking and managing your trips are in the final stretch before release. Until then, the mobile site does everything the apps will.',
      },
    },
  },
  ar: {
    kicker: 'التقنية في Egypt Excursions Online',
    title: 'التقنية التي تقف خلف رحلتك في مصر',
    subtitle:
      'ابحث واسأل واحجز وسافر بأدوات صُممت لطريقة تخطيطك. كل إمكانية أدناه تعرض حالتها الحالية بعد فحص مباشر لخدماتنا.',
    primaryCta: 'استكشف الرحلات',
    secondaryCta: 'جرّب المساعد الصوتي',
    statusHeading: 'ما المتاح اليوم',
    statusIntro: 'تُعاد مراجعة الحالة كل دقيقة. إذا لم تستجب خدمة ما فسنقول ذلك بدلًا من التخمين.',
    badgeLive: 'متاح',
    badgePreview: 'قريبًا',
    badgeUnavailable: 'الحالة غير متاحة',
    badgeChecking: 'جارٍ فحص الحالة…',
    statusError: 'تعذّر فحص الحالة الآن. ستظهر كل إمكانية كغير متاحة حتى ينجح الفحص التالي.',
    unavailableHint: 'هذه الخدمة لا تستجيب حاليًا. باقي الموقع يعمل كالمعتاد.',
    previewHint: 'قريبًا. غير متاح للتنزيل بعد.',
    checkedAt: 'آخر فحص',
    capabilities: {
      'ai-voice': {
        title: 'مساعد صوتي بالذكاء الاصطناعي',
        body: 'تحدث مع نايل عن الرحلات والمواعيد والأسعار والاستلام بالعربية أو الإنجليزية. كل إجابة تأتي من كتالوجنا الحقيقي.',
        cta: 'تحدث مع نايل',
      },
      'ai-search': {
        title: 'بحث ذكي للرحلات',
        body: 'شريط البحث في كل صفحة يفهم الأسئلة العادية مثل «نصف يوم في الأقصر مع مرشد» ويعرض رحلات يمكنك حجزها من كتالوجنا الفعلي.',
        cta: 'اسأل بحث الرحلات',
      },
      'online-booking': {
        title: 'الحجز الإلكتروني والدفع الآمن',
        body: 'اختر التاريخ والخيارات وادفع بأمان بالبطاقة. يصلك التأكيد والقسيمة عبر البريد، وتظهر كل حجوزاتك في حسابك.',
        cta: 'تصفّح الرحلات',
      },
      'mobile-apps': {
        title: 'تطبيقات الجوال',
        body: 'تطبيقاتنا لنظامي iOS وأندرويد لحجز رحلاتك وإدارتها في مراحلها الأخيرة قبل الإطلاق. حتى ذلك الحين يقدّم موقع الجوال كل ما ستقدمه التطبيقات.',
      },
    },
  },
  de: {
    kicker: 'Technologie bei Egypt Excursions Online',
    title: 'Die Technologie hinter Ihrer Ägyptenreise',
    subtitle:
      'Suchen, fragen, buchen und reisen mit Werkzeugen, die zu Ihrer Planung passen. Jede Funktion unten zeigt ihren aktuellen Status, live gegen unsere eigenen Dienste geprüft.',
    primaryCta: 'Touren entdecken',
    secondaryCta: 'Sprachassistent ausprobieren',
    statusHeading: 'Was heute verfügbar ist',
    statusIntro: 'Der Status wird jede Minute neu geprüft. Antwortet ein Dienst nicht, sagen wir das, statt zu raten.',
    badgeLive: 'Verfügbar',
    badgePreview: 'Vorschau',
    badgeUnavailable: 'Status nicht verfügbar',
    badgeChecking: 'Status wird geprüft…',
    statusError:
      'Der Status konnte gerade nicht geprüft werden. Jede Funktion wird als nicht verfügbar angezeigt, bis die nächste Prüfung gelingt.',
    unavailableHint: 'Dieser Dienst antwortet gerade nicht. Der Rest der Website funktioniert wie gewohnt.',
    previewHint: 'Demnächst. Noch nicht zum Herunterladen verfügbar.',
    checkedAt: 'Zuletzt geprüft',
    capabilities: {
      'ai-voice': {
        title: 'KI-Sprachassistent',
        body: 'Sprechen Sie mit Nile über Touren, Verfügbarkeit, Preise und Abholung, auf Englisch oder Arabisch. Jede Antwort stammt aus unserem echten Katalog.',
        cta: 'Mit Nile sprechen',
      },
      'ai-search': {
        title: 'KI-Reisesuche',
        body: 'Die Suchleiste auf jeder Seite versteht einfache Fragen wie „ein halber Tag in Luxor mit Guide“ und liefert buchbare Touren aus unserem aktuellen Katalog.',
        cta: 'Reisesuche fragen',
      },
      'online-booking': {
        title: 'Online-Buchung & sichere Zahlung',
        body: 'Datum wählen, Optionen festlegen und sicher per Karte bezahlen. Bestätigung und Voucher kommen per E-Mail, jede Buchung erscheint in Ihrem Konto.',
        cta: 'Touren ansehen',
      },
      'mobile-apps': {
        title: 'Mobile Apps',
        body: 'Unsere iOS- und Android-Apps zum Buchen und Verwalten Ihrer Reisen stehen kurz vor der Veröffentlichung. Bis dahin bietet die mobile Website alles, was die Apps können werden.',
      },
    },
  },
  fr: {
    kicker: 'La technologie chez Egypt Excursions Online',
    title: 'La technologie derrière votre voyage en Égypte',
    subtitle:
      'Cherchez, demandez, réservez et voyagez avec des outils pensés pour votre façon de planifier. Chaque fonctionnalité ci-dessous affiche son état actuel, vérifié en direct auprès de nos propres services.',
    primaryCta: 'Découvrir les excursions',
    secondaryCta: 'Essayer le concierge vocal',
    statusHeading: 'Ce qui est disponible aujourd’hui',
    statusIntro: 'L’état est revérifié chaque minute. Si un service ne répond pas, nous le disons plutôt que de deviner.',
    badgeLive: 'Disponible',
    badgePreview: 'Aperçu',
    badgeUnavailable: 'État indisponible',
    badgeChecking: 'Vérification…',
    statusError:
      'Impossible de vérifier l’état pour le moment. Chaque fonctionnalité apparaît comme indisponible jusqu’à la prochaine vérification réussie.',
    unavailableHint: 'Ce service ne répond pas pour l’instant. Le reste du site fonctionne normalement.',
    previewHint: 'Bientôt disponible. Pas encore téléchargeable.',
    checkedAt: 'Dernière vérification',
    capabilities: {
      'ai-voice': {
        title: 'Concierge vocal IA',
        body: 'Parlez à Nile des excursions, disponibilités, prix et prises en charge, en anglais ou en arabe. Chaque réponse vient de notre vrai catalogue.',
        cta: 'Parler à Nile',
      },
      'ai-search': {
        title: 'Recherche voyage IA',
        body: 'La barre de recherche présente sur chaque page comprend des questions simples comme « une demi-journée à Louxor avec guide » et propose des excursions réservables, issues de notre catalogue en direct.',
        cta: 'Interroger la recherche',
      },
      'online-booking': {
        title: 'Réservation en ligne & paiement sécurisé',
        body: 'Choisissez une date et vos options, puis payez en toute sécurité par carte. Confirmation et bon d’échange arrivent par e-mail, et chaque réservation est visible dans votre compte.',
        cta: 'Voir les excursions',
      },
      'mobile-apps': {
        title: 'Applications mobiles',
        body: 'Nos applications iOS et Android pour réserver et gérer vos voyages arrivent bientôt. D’ici là, le site mobile fait tout ce que les applications feront.',
      },
    },
  },
  es: {
    kicker: 'Tecnología en Egypt Excursions Online',
    title: 'La tecnología detrás de tu viaje a Egipto',
    subtitle:
      'Busca, pregunta, reserva y viaja con herramientas hechas para tu forma de planificar. Cada función muestra su estado actual, comprobado en directo con nuestros propios servicios.',
    primaryCta: 'Explorar tours',
    secondaryCta: 'Probar el conserje de voz',
    statusHeading: 'Qué está disponible hoy',
    statusIntro: 'El estado se vuelve a comprobar cada minuto. Si un servicio no responde, lo decimos en lugar de suponer.',
    badgeLive: 'Disponible',
    badgePreview: 'Vista previa',
    badgeUnavailable: 'Estado no disponible',
    badgeChecking: 'Comprobando estado…',
    statusError:
      'No hemos podido comprobar el estado ahora mismo. Cada función aparece como no disponible hasta que la próxima comprobación funcione.',
    unavailableHint: 'Este servicio no responde en este momento. El resto del sitio funciona con normalidad.',
    previewHint: 'Próximamente. Aún no disponible para descargar.',
    checkedAt: 'Última comprobación',
    capabilities: {
      'ai-voice': {
        title: 'Conserje de voz con IA',
        body: 'Habla con Nile sobre tours, disponibilidad, precios y recogidas, en inglés o árabe. Cada respuesta sale de nuestro catálogo real.',
        cta: 'Hablar con Nile',
      },
      'ai-search': {
        title: 'Búsqueda de viajes con IA',
        body: 'La barra de búsqueda de cada página entiende preguntas normales como «medio día en Luxor con guía» y devuelve tours que puedes reservar, basados en nuestro catálogo en directo.',
        cta: 'Preguntar al buscador',
      },
      'online-booking': {
        title: 'Reserva online y pago seguro',
        body: 'Elige fecha y opciones y paga de forma segura con tarjeta. La confirmación y el bono llegan por correo, y cada reserva aparece en tu cuenta.',
        cta: 'Ver tours',
      },
      'mobile-apps': {
        title: 'Aplicaciones móviles',
        body: 'Nuestras apps para iOS y Android para reservar y gestionar tus viajes están en la recta final antes del lanzamiento. Hasta entonces, el sitio móvil hace todo lo que harán las apps.',
      },
    },
  },
};

const CAPABILITY_ICONS: Record<CapabilityId, typeof Headphones> = {
  'ai-voice': Headphones,
  'ai-search': Search,
  'online-booking': CreditCard,
  'mobile-apps': Smartphone,
};

type StatusState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ready'; payload: TechnologyStatusPayload };

type BadgeKind = 'live' | 'preview' | 'unavailable' | 'checking';

function badgeFor(tier: 'accepted' | 'preview', state: StatusState, observation?: CapabilityObservation): BadgeKind {
  if (tier === 'preview') return 'preview';
  if (state.kind === 'loading') return 'checking';
  if (state.kind === 'error' || !observation) return 'unavailable';
  return observation.status === 'live' ? 'live' : 'unavailable';
}

const BADGE_STYLES: Record<BadgeKind, string> = {
  live: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  preview: 'border-sky-200 bg-sky-50 text-sky-800',
  unavailable: 'border-amber-200 bg-amber-50 text-amber-900',
  checking: 'border-slate-200 bg-slate-100 text-slate-600',
};

function StatusBadge({ kind, labels }: { kind: BadgeKind; labels: TechnologyCopy }) {
  const label = {
    live: labels.badgeLive,
    preview: labels.badgePreview,
    unavailable: labels.badgeUnavailable,
    checking: labels.badgeChecking,
  }[kind];
  const Icon = { live: CheckCircle2, preview: Clock3, unavailable: AlertCircle, checking: Loader2 }[kind];
  return (
    <span
      data-testid={`status-badge-${kind}`}
      role="status"
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${BADGE_STYLES[kind]}`}
    >
      <Icon className={`h-3.5 w-3.5 ${kind === 'checking' ? 'animate-spin' : ''}`} aria-hidden />
      {label}
    </span>
  );
}

export default function TechnologyPageContent({ locale }: { locale: string }) {
  const localized = copy[locale] || copy.en;
  const router = useRouter();
  const [state, setState] = useState<StatusState>({ kind: 'loading' });
  const fallbackTimerRef = useRef<number | null>(null);

  // Initial check, then refresh whenever the observation can have expired so
  // an open tab never keeps a stale "Live" badge. State only changes after the
  // response arrives; an aborted (unmounted) request changes nothing.
  useEffect(() => {
    const controller = new AbortController();
    const loadStatus = async () => {
      try {
        const response = await fetch('/api/technology/status', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error(`status ${response.status}`);
        const payload = (await response.json()) as TechnologyStatusPayload;
        if (!Array.isArray(payload?.capabilities)) throw new Error('malformed');
        if (!controller.signal.aborted) setState({ kind: 'ready', payload });
      } catch (error) {
        if (controller.signal.aborted || (error as { name?: string })?.name === 'AbortError') return;
        setState({ kind: 'error' });
      }
    };

    void loadStatus();
    const interval = window.setInterval(() => void loadStatus(), STATUS_CACHE_TTL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void loadStatus();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      if (fallbackTimerRef.current !== null) window.clearTimeout(fallbackTimerRef.current);
    };
  }, []);

  const openTripSearch = () => {
    if (fallbackTimerRef.current !== null) window.clearTimeout(fallbackTimerRef.current);
    const request = requestHostedAISearch({ mode: 'ai', locale });
    // The hosted search loads asynchronously; keep a working first-party
    // route if the launcher never picks this request up.
    fallbackTimerRef.current = window.setTimeout(() => {
      if (window.__foxesSearchPending !== request) return;
      window.__foxesSearchPending = null;
      router.push(buildHostedSearchFallbackHref(locale));
    }, 2200);
  };

  const observations = state.kind === 'ready' ? state.payload.capabilities : [];
  const checkedAt = state.kind === 'ready' ? new Date(state.payload.checkedAt) : null;

  return (
    <main className="bg-white">
      <section className="relative overflow-hidden bg-slate-900 px-4 pb-14 pt-24 text-center text-white sm:py-24">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(67,133,246,0.4), transparent 65%)' }}
        />
        <div className="relative z-10 mx-auto max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-300">{localized.kicker}</p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">{localized.title}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-slate-300 sm:text-lg">{localized.subtitle}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/tours"
              className="inline-flex w-full items-center justify-center rounded-full bg-[#4385F6] px-8 py-4 text-base font-bold text-white shadow-lg shadow-[#4385F6]/25 transition hover:bg-[#3479EB] sm:w-auto sm:text-lg"
            >
              {localized.primaryCta}
            </Link>
            <Link
              href="/ai-voice"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-white px-8 py-4 text-base font-bold text-white transition hover:bg-white/10 sm:w-auto sm:text-lg"
            >
              <Headphones className="h-5 w-5" aria-hidden />
              {localized.secondaryCta}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:py-16">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{localized.statusHeading}</h2>
            <p className="mt-2 max-w-2xl text-slate-600">{localized.statusIntro}</p>
          </div>
          {checkedAt && Number.isFinite(checkedAt.getTime()) ? (
            <p className="text-xs text-slate-500">
              {localized.checkedAt}:{' '}
              <time dateTime={checkedAt.toISOString()}>{checkedAt.toLocaleTimeString(locale)}</time>
            </p>
          ) : null}
        </div>

        {state.kind === 'error' ? (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <p>{localized.statusError}</p>
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {SHOWCASE_CAPABILITIES.map((capability) => {
            const text = localized.capabilities[capability.copyKey];
            const Icon = CAPABILITY_ICONS[capability.id];
            const observation = observations.find((entry) => entry.id === capability.id);
            const badge = badgeFor(capability.tier, state, observation);

            return (
              <article
                key={capability.id}
                data-testid={`capability-${capability.id}`}
                className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <Icon className="h-7 w-7 text-[#1D5FD0]" aria-hidden />
                  <StatusBadge kind={badge} labels={localized} />
                </div>
                <h3 className="mt-3 text-lg font-bold text-slate-900">{text.title}</h3>
                <p className="mt-2 flex-1 text-slate-600">{text.body}</p>

                {badge === 'unavailable' ? (
                  <p className="mt-3 text-sm text-amber-900">{localized.unavailableHint}</p>
                ) : null}
                {badge === 'preview' ? <p className="mt-3 text-sm text-sky-800">{localized.previewHint}</p> : null}

                {capability.tier === 'accepted' && text.cta ? (
                  capability.id === 'ai-search' ? (
                    <button
                      type="button"
                      onClick={openTripSearch}
                      className="mt-5 inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
                    >
                      {text.cta}
                    </button>
                  ) : (
                    <Link
                      href={capability.href ?? '/tours'}
                      className="mt-5 inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
                    >
                      {text.cta}
                    </Link>
                  )
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
