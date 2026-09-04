'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  Headphones,
  Mic2,
  Search,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { requestHostedAISearch } from '@/lib/hostedAISearch';

const VOICE_ORIGIN = process.env.NEXT_PUBLIC_FOXES_VOICE_ORIGIN || 'https://voice.foxestechnology.com';
const VOICE_WIDGET_ID = process.env.NEXT_PUBLIC_FOXES_VOICE_WIDGET_ID || '694c1a7a27cc23227da2ccdb';
const VOICE_SCRIPT_ID = 'eeo-assistants-voice-script';
const VOICE_FRAME_ID = 'foxes-voice-widget-frame';

const SEARCH_SCRIPT_ID = 'eeo-search-concierge-script';
const SEARCH_HOST_ID = 'foxes-launcher-host';
const SEARCH_CLOSE_EVENT = 'foxes:search:close';
const SEARCH_SHOWCASE_STYLE = 'eeo-assistants-search-style';

const BOOKING_ORIGIN = process.env.NEXT_PUBLIC_FOXES_BOOKING_ORIGIN || 'https://booking.foxestechnology.com';
const BOOKING_WIDGET_RELEASE = process.env.NEXT_PUBLIC_FOXES_BOOKING_WIDGET_RELEASE || '683bc4a';
const BOOKING_SCRIPT_ID = 'eeo-assistants-booking-script';
const BOOKING_TRIGGER_ID = 'foxes-v2-trigger';
const BOOKING_ROOT_SELECTOR = '.foxes-widget-v2';
const WIDGET_READY_TIMEOUT_MS = 12_000;

type WidgetState = 'loading' | 'ready' | 'unavailable';
type AssistantKey = 'search' | 'voice' | 'booking';

declare global {
  interface Window {
    foxes?: (command: 'open' | 'close' | 'destroy') => void;
    openFoxesBooking?: (productId?: string) => Promise<void>;
    closeFoxesBooking?: () => void;
  }
}

type CardCopy = {
  eyebrow: string;
  title: string;
  description: string;
  detail: string;
  action: string;
};

type ShowcaseCopy = {
  badge: string;
  title: string;
  subtitle: string;
  intro: string;
  privacy: string;
  status: Record<WidgetState, string>;
  unavailableHelp: string;
  cards: Record<AssistantKey, CardCopy>;
  footer: [string, string, string];
};

const COPY: Record<string, ShowcaseCopy> = {
  en: {
    badge: 'EEO travel assistants',
    title: 'Plan your Egypt trip your way.',
    subtitle: 'Search, speak, or build a booking — each assistant opens only when you choose it.',
    intro: 'One calm place for the three tools that help you go from an idea to the right experience.',
    privacy: 'Nothing starts automatically. You stay in control of the microphone and booking details.',
    status: { loading: 'Connecting…', ready: 'Ready', unavailable: 'Unavailable' },
    unavailableHelp: 'This assistant could not connect. Refresh the page and try again.',
    cards: {
      search: {
        eyebrow: 'Discover',
        title: 'AI trip search',
        description: 'Search the live EEO catalogue and compare grounded recommendations for your dates and travel style.',
        detail: 'Best for ideas, comparisons and finding the right tour quickly.',
        action: 'Open AI search',
      },
      voice: {
        eyebrow: 'Talk',
        title: 'Voice concierge',
        description: 'Open the assistant, then choose when to use your microphone and ask your question out loud.',
        detail: 'Best when speaking is easier than typing. No call starts automatically.',
        action: 'Open voice assistant',
      },
      booking: {
        eyebrow: 'Build',
        title: 'Booking preview',
        description: 'Browse the configured experiences and walk through dates, guests, options and traveller details.',
        detail: 'A guided preview only — no payment is charged from this showcase.',
        action: 'Open booking preview',
      },
    },
    footer: ['Live catalogue search', 'Microphone starts only with you', 'No payment in preview'],
  },
  ar: {
    badge: 'مساعدو السفر من EEO',
    title: 'خطّط لرحلتك إلى مصر بالطريقة التي تناسبك.',
    subtitle: 'ابحث أو تحدّث أو أنشئ حجزاً — لن يفتح أي مساعد إلا عندما تختاره.',
    intro: 'مكان واحد هادئ لثلاث أدوات تساعدك من الفكرة الأولى حتى اختيار التجربة المناسبة.',
    privacy: 'لا يبدأ أي شيء تلقائياً. أنت تتحكم في الميكروفون وبيانات الحجز.',
    status: { loading: 'جارٍ الاتصال…', ready: 'جاهز', unavailable: 'غير متاح' },
    unavailableHelp: 'تعذّر الاتصال بهذا المساعد. حدّث الصفحة وحاول مرة أخرى.',
    cards: {
      search: {
        eyebrow: 'اكتشف',
        title: 'بحث الرحلات بالذكاء الاصطناعي',
        description: 'ابحث في دليل EEO المباشر وقارن اقتراحات موثوقة تناسب مواعيدك وأسلوب سفرك.',
        detail: 'مثالي للأفكار والمقارنات والعثور على الرحلة المناسبة بسرعة.',
        action: 'افتح البحث الذكي',
      },
      voice: {
        eyebrow: 'تحدّث',
        title: 'المساعد الصوتي',
        description: 'افتح المساعد ثم اختر متى تستخدم الميكروفون واسأل بصوتك.',
        detail: 'مثالي عندما يكون الكلام أسهل من الكتابة. لا تبدأ أي مكالمة تلقائياً.',
        action: 'افتح المساعد الصوتي',
      },
      booking: {
        eyebrow: 'أنشئ',
        title: 'معاينة الحجز',
        description: 'تصفّح التجارب المتاحة وانتقل بين المواعيد والضيوف والخيارات وبيانات المسافر.',
        detail: 'معاينة إرشادية فقط — لن يتم تحصيل أي دفعة من هذه الصفحة.',
        action: 'افتح معاينة الحجز',
      },
    },
    footer: ['بحث مباشر في الرحلات', 'الميكروفون يبدأ باختيارك', 'لا توجد دفعة في المعاينة'],
  },
  de: {
    badge: 'EEO Reiseassistenten',
    title: 'Planen Sie Ihre Ägyptenreise auf Ihre Art.',
    subtitle: 'Suchen, sprechen oder eine Buchung zusammenstellen — jeder Assistent öffnet sich erst nach Ihrer Wahl.',
    intro: 'Ein ruhiger Ort für drei Werkzeuge, die Sie von der ersten Idee bis zum passenden Erlebnis begleiten.',
    privacy: 'Nichts startet automatisch. Mikrofon und Buchungsdaten bleiben unter Ihrer Kontrolle.',
    status: { loading: 'Verbindung…', ready: 'Bereit', unavailable: 'Nicht verfügbar' },
    unavailableHelp: 'Dieser Assistent konnte keine Verbindung herstellen. Laden Sie die Seite neu.',
    cards: {
      search: {
        eyebrow: 'Entdecken',
        title: 'KI-Reisesuche',
        description: 'Durchsuchen Sie den aktuellen EEO-Katalog und vergleichen Sie fundierte Empfehlungen für Ihre Reisedaten.',
        detail: 'Ideal für Ideen, Vergleiche und die schnelle Suche nach der passenden Tour.',
        action: 'KI-Suche öffnen',
      },
      voice: {
        eyebrow: 'Sprechen',
        title: 'Sprachassistent',
        description: 'Öffnen Sie den Assistenten und entscheiden Sie selbst, wann Sie das Mikrofon verwenden.',
        detail: 'Ideal, wenn Sprechen leichter ist als Tippen. Es startet kein Anruf automatisch.',
        action: 'Sprachassistent öffnen',
      },
      booking: {
        eyebrow: 'Zusammenstellen',
        title: 'Buchungsvorschau',
        description: 'Erlebnisse ansehen und Termine, Gäste, Optionen sowie Reisedaten Schritt für Schritt auswählen.',
        detail: 'Nur eine geführte Vorschau — auf dieser Seite wird keine Zahlung belastet.',
        action: 'Buchungsvorschau öffnen',
      },
    },
    footer: ['Aktuelle Katalogsuche', 'Mikrofon nur mit Ihrer Wahl', 'Keine Zahlung in der Vorschau'],
  },
  fr: {
    badge: 'Assistants de voyage EEO',
    title: 'Planifiez votre voyage en Égypte à votre façon.',
    subtitle: 'Recherchez, parlez ou préparez une réservation — chaque assistant ne s’ouvre que lorsque vous le choisissez.',
    intro: 'Un espace serein pour trois outils qui vous accompagnent de l’idée à la bonne expérience.',
    privacy: 'Rien ne démarre automatiquement. Vous gardez le contrôle du microphone et des détails de réservation.',
    status: { loading: 'Connexion…', ready: 'Prêt', unavailable: 'Indisponible' },
    unavailableHelp: 'Impossible de connecter cet assistant. Actualisez la page et réessayez.',
    cards: {
      search: {
        eyebrow: 'Découvrir',
        title: 'Recherche voyage IA',
        description: 'Explorez le catalogue EEO en direct et comparez des recommandations adaptées à vos dates et envies.',
        detail: 'Idéal pour trouver des idées, comparer et choisir rapidement la bonne excursion.',
        action: 'Ouvrir la recherche IA',
      },
      voice: {
        eyebrow: 'Parler',
        title: 'Assistant vocal',
        description: 'Ouvrez l’assistant, puis choisissez quand activer votre microphone et poser votre question à voix haute.',
        detail: 'Idéal si parler est plus simple qu’écrire. Aucun appel ne démarre automatiquement.',
        action: 'Ouvrir l’assistant vocal',
      },
      booking: {
        eyebrow: 'Préparer',
        title: 'Aperçu de réservation',
        description: 'Parcourez les expériences configurées et choisissez dates, participants, options et coordonnées.',
        detail: 'Aperçu guidé uniquement — aucun paiement n’est débité depuis cette vitrine.',
        action: 'Ouvrir l’aperçu',
      },
    },
    footer: ['Catalogue en direct', 'Microphone à votre initiative', 'Aucun paiement dans l’aperçu'],
  },
  es: {
    badge: 'Asistentes de viaje EEO',
    title: 'Planifica tu viaje a Egipto a tu manera.',
    subtitle: 'Busca, habla o prepara una reserva: cada asistente se abre solo cuando tú lo eliges.',
    intro: 'Un espacio tranquilo para tres herramientas que te llevan desde la idea hasta la experiencia adecuada.',
    privacy: 'Nada empieza automáticamente. Tú controlas el micrófono y los datos de la reserva.',
    status: { loading: 'Conectando…', ready: 'Listo', unavailable: 'No disponible' },
    unavailableHelp: 'No se pudo conectar este asistente. Actualiza la página e inténtalo de nuevo.',
    cards: {
      search: {
        eyebrow: 'Descubre',
        title: 'Búsqueda de viajes con IA',
        description: 'Busca en el catálogo EEO en directo y compara recomendaciones basadas en tus fechas y estilo de viaje.',
        detail: 'Ideal para inspirarte, comparar y encontrar rápidamente la excursión adecuada.',
        action: 'Abrir búsqueda con IA',
      },
      voice: {
        eyebrow: 'Habla',
        title: 'Asistente de voz',
        description: 'Abre el asistente y decide cuándo usar el micrófono para hacer tu pregunta en voz alta.',
        detail: 'Ideal si hablar es más fácil que escribir. No se inicia ninguna llamada automáticamente.',
        action: 'Abrir asistente de voz',
      },
      booking: {
        eyebrow: 'Prepara',
        title: 'Vista previa de reserva',
        description: 'Explora las experiencias configuradas y recorre fechas, viajeros, opciones y datos de contacto.',
        detail: 'Solo es una vista guiada: no se cobra ningún pago desde este escaparate.',
        action: 'Abrir vista de reserva',
      },
    },
    footer: ['Catálogo en directo', 'Micrófono solo cuando tú quieras', 'Sin pago en la vista previa'],
  },
};

const CARD_STYLE: Record<AssistantKey, { icon: LucideIcon; accent: string; wash: string }> = {
  search: { icon: Search, accent: 'text-blue-700', wash: 'bg-blue-50 ring-blue-100' },
  voice: { icon: Mic2, accent: 'text-violet-700', wash: 'bg-violet-50 ring-violet-100' },
  booking: { icon: CalendarDays, accent: 'text-orange-700', wash: 'bg-orange-50 ring-orange-100' },
};

function StatusPill({ state, label }: { state: WidgetState; label: string }) {
  const stateClass = {
    loading: 'border-slate-200 bg-slate-50 text-slate-500',
    ready: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    unavailable: 'border-rose-200 bg-rose-50 text-rose-700',
  }[state];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${stateClass}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${state === 'loading' ? 'animate-pulse bg-slate-400' : state === 'ready' ? 'bg-emerald-500' : 'bg-rose-500'}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

function AssistantCard({
  kind,
  copy,
  state,
  statusLabel,
  unavailableHelp,
  onOpen,
}: {
  kind: AssistantKey;
  copy: CardCopy;
  state: WidgetState;
  statusLabel: string;
  unavailableHelp: string;
  onOpen: () => void;
}) {
  const style = CARD_STYLE[kind];
  const Icon = style.icon;
  const statusId = `${kind}-assistant-status`;

  return (
    <article className="group flex flex-col rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.4)] ring-1 ring-slate-200/70 backdrop-blur sm:p-7 lg:min-h-[430px]">
      <div className="flex items-start justify-between gap-4">
        <span className={`grid h-12 w-12 place-items-center rounded-2xl ring-1 sm:h-14 sm:w-14 ${style.wash}`}>
          <Icon className={`h-6 w-6 ${style.accent}`} aria-hidden="true" />
        </span>
        <StatusPill state={state} label={statusLabel} />
      </div>

      <p className={`mt-5 text-xs font-bold uppercase tracking-[0.22em] sm:mt-7 ${style.accent}`}>{copy.eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{copy.title}</h2>
      <p className="mt-3 text-[15px] leading-7 text-slate-600 sm:mt-4">{copy.description}</p>
      <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600 sm:mt-5">
        <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
        <span>{copy.detail}</span>
      </div>

      <div className="mt-auto pt-5 sm:pt-7">
        <p id={statusId} className="text-xs leading-5 text-slate-500 lg:min-h-10" aria-live="polite">
          {state === 'unavailable' ? unavailableHelp : ''}
        </p>
        <button
          type="button"
          disabled={state !== 'ready'}
          aria-describedby={statusId}
          onClick={onOpen}
          data-testid={`open-${kind}-assistant`}
          className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none disabled:hover:translate-y-0"
        >
          {copy.action}
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function isVoiceFrameExpanded(frame: HTMLElement) {
  const width = Number.parseFloat(frame.style.width) || frame.getBoundingClientRect().width;
  const height = Number.parseFloat(frame.style.height) || frame.getBoundingClientRect().height;
  return window.matchMedia('(max-width: 639px)').matches
    ? width >= window.innerWidth - 1
    : width >= 400 && height >= 600;
}

export default function AssistantsClient() {
  const localeValue = useLocale();
  const locale = COPY[localeValue] ? localeValue : 'en';
  const copy = COPY[locale];
  const bookingOrgId = process.env.NEXT_PUBLIC_FOXES_BOOKING_ORG_ID || '';
  const [states, setStates] = useState<Record<AssistantKey, WidgetState>>({
    search: 'loading',
    voice: 'loading',
    booking: bookingOrgId ? 'loading' : 'unavailable',
  });
  const syncFrameRef = useRef<number | null>(null);
  const voiceRequestedRef = useRef(false);
  const voiceWasOpenRef = useRef(false);
  const voiceOpenTimerRef = useRef<number | null>(null);

  const setWidgetState = useCallback((kind: AssistantKey, state: WidgetState) => {
    setStates((current) => (current[kind] === state ? current : { ...current, [kind]: state }));
  }, []);

  useEffect(() => {
    let timedOut = false;
    const headStylesBefore = new Set(document.head.querySelectorAll('style'));
    const previousBodyOverflow = document.body.style.overflow;

    const suppressSearchLauncher = () => {
      const host = document.getElementById(SEARCH_HOST_ID);
      const shadow = host?.shadowRoot;
      if (!shadow || shadow.getElementById(SEARCH_SHOWCASE_STYLE)) return;
      const style = document.createElement('style');
      style.id = SEARCH_SHOWCASE_STYLE;
      style.textContent = '.launcher{display:none!important}';
      shadow.appendChild(style);
    };

    const syncWidgets = () => {
      const searchScript = document.getElementById(SEARCH_SCRIPT_ID);
      const searchHost = document.getElementById(SEARCH_HOST_ID);
      const searchReady = Boolean(searchHost?.isConnected && searchHost.style.display !== 'none');
      if (searchReady) {
        setWidgetState('search', 'ready');
        suppressSearchLauncher();
      } else if (timedOut && searchScript) {
        setWidgetState('search', 'unavailable');
      }

      const voiceScript = document.getElementById(VOICE_SCRIPT_ID);
      const voiceFrame = document.getElementById(VOICE_FRAME_ID) as HTMLElement | null;
      const voiceReady = Boolean(voiceFrame?.isConnected && voiceFrame.style.display !== 'none');
      if (voiceReady && voiceFrame) {
        setWidgetState('voice', 'ready');
        const expanded = isVoiceFrameExpanded(voiceFrame);
        if (expanded) voiceWasOpenRef.current = true;
        if (!expanded && voiceWasOpenRef.current) {
          voiceWasOpenRef.current = false;
          voiceRequestedRef.current = false;
        }

        const keepVisible = expanded || voiceRequestedRef.current;
        if (keepVisible) {
          if (voiceFrame.style.visibility) voiceFrame.style.removeProperty('visibility');
          if (voiceFrame.style.pointerEvents) voiceFrame.style.removeProperty('pointer-events');
        } else {
          if (
            voiceFrame.style.visibility !== 'hidden' ||
            voiceFrame.style.getPropertyPriority('visibility') !== 'important'
          ) {
            voiceFrame.style.setProperty('visibility', 'hidden', 'important');
          }
          if (
            voiceFrame.style.pointerEvents !== 'none' ||
            voiceFrame.style.getPropertyPriority('pointer-events') !== 'important'
          ) {
            voiceFrame.style.setProperty('pointer-events', 'none', 'important');
          }
        }
      } else if (timedOut && voiceScript) {
        setWidgetState('voice', 'unavailable');
      }

      const bookingScript = document.getElementById(BOOKING_SCRIPT_ID);
      const bookingTrigger = document.getElementById(BOOKING_TRIGGER_ID) as HTMLElement | null;
      const bookingStage = document.getElementById('foxes-v2-stage');
      const bookingError = document.querySelector(`${BOOKING_ROOT_SELECTOR} .foxes-widget-v2-error`);
      if (
        bookingTrigger &&
        (bookingTrigger.style.display !== 'none' ||
          bookingTrigger.style.getPropertyPriority('display') !== 'important')
      ) {
        bookingTrigger.style.setProperty('display', 'none', 'important');
      }

      if (bookingError) {
        setWidgetState('booking', 'unavailable');
      } else if (bookingTrigger && bookingStage?.childElementCount) {
        setWidgetState('booking', 'ready');
      } else if (timedOut && bookingScript) {
        setWidgetState('booking', 'unavailable');
      }
    };

    const scheduleSync = () => {
      if (syncFrameRef.current !== null) return;
      syncFrameRef.current = window.requestAnimationFrame(() => {
        syncFrameRef.current = null;
        syncWidgets();
      });
    };

    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'inert'],
    });
    window.addEventListener('resize', scheduleSync);

    if (!document.getElementById(VOICE_SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = VOICE_SCRIPT_ID;
      script.src = `${VOICE_ORIGIN}/widget.js`;
      script.async = true;
      script.dataset.foxesWidgetId = VOICE_WIDGET_ID;
      script.dataset.foxesPosition = locale === 'ar' ? 'bottom-right' : 'bottom-left';
      script.onerror = () => setWidgetState('voice', 'unavailable');
      document.body.appendChild(script);
    }

    if (bookingOrgId && !document.getElementById(BOOKING_SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = BOOKING_SCRIPT_ID;
      script.src = `${BOOKING_ORIGIN}/widget/foxes-booking-v2.js?v=${encodeURIComponent(BOOKING_WIDGET_RELEASE)}`;
      script.async = true;
      script.setAttribute('data-foxes-widget', '');
      script.setAttribute('data-org-id', bookingOrgId);
      script.setAttribute(
        'data-api-url',
        process.env.NEXT_PUBLIC_FOXES_BOOKING_API ||
          'https://foxes-api-production.up.railway.app/api/v1',
      );
      script.onerror = () => setWidgetState('booking', 'unavailable');
      document.body.appendChild(script);
    }

    const readyTimeout = window.setTimeout(() => {
      timedOut = true;
      syncWidgets();
      setStates((current) => ({
        search: current.search === 'loading' ? 'unavailable' : current.search,
        voice: current.voice === 'loading' ? 'unavailable' : current.voice,
        booking: current.booking === 'loading' ? 'unavailable' : current.booking,
      }));
    }, WIDGET_READY_TIMEOUT_MS);

    scheduleSync();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', scheduleSync);
      window.clearTimeout(readyTimeout);
      if (syncFrameRef.current !== null) window.cancelAnimationFrame(syncFrameRef.current);
      if (voiceOpenTimerRef.current !== null) window.clearTimeout(voiceOpenTimerRef.current);
      document.getElementById(SEARCH_HOST_ID)?.shadowRoot?.getElementById(SEARCH_SHOWCASE_STYLE)?.remove();
      window.dispatchEvent(new CustomEvent(SEARCH_CLOSE_EVENT));
      window.closeFoxesBooking?.();
      window.foxes?.('destroy');
      document.getElementById(VOICE_SCRIPT_ID)?.remove();
      document.getElementById(VOICE_FRAME_ID)?.remove();
      document.getElementById(BOOKING_SCRIPT_ID)?.remove();
      document.querySelectorAll(BOOKING_ROOT_SELECTOR).forEach((root) => root.remove());
      document.head.querySelectorAll('style').forEach((style) => {
        if (!headStylesBefore.has(style) && style.textContent?.includes('.foxes-widget-v2')) style.remove();
      });
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [bookingOrgId, locale, setWidgetState]);

  const closeOtherAssistants = useCallback((keep: AssistantKey) => {
    if (keep !== 'search') window.dispatchEvent(new CustomEvent(SEARCH_CLOSE_EVENT));
    if (keep !== 'booking') window.closeFoxesBooking?.();
    if (keep !== 'voice') window.foxes?.('close');
  }, []);

  const openSearch = useCallback(() => {
    closeOtherAssistants('search');
    window.requestAnimationFrame(() => {
      requestHostedAISearch({ query: '', mode: 'catalog', locale });
    });
  }, [closeOtherAssistants, locale]);

  const openVoice = useCallback(() => {
    closeOtherAssistants('voice');
    const frame = document.getElementById(VOICE_FRAME_ID) as HTMLElement | null;
    voiceRequestedRef.current = true;
    frame?.style.removeProperty('visibility');
    frame?.style.removeProperty('pointer-events');
    window.requestAnimationFrame(() => window.foxes?.('open'));

    if (voiceOpenTimerRef.current !== null) window.clearTimeout(voiceOpenTimerRef.current);
    voiceOpenTimerRef.current = window.setTimeout(() => {
      voiceRequestedRef.current = false;
      const currentFrame = document.getElementById(VOICE_FRAME_ID) as HTMLElement | null;
      if (currentFrame && !isVoiceFrameExpanded(currentFrame)) {
        currentFrame.style.setProperty('visibility', 'hidden', 'important');
        currentFrame.style.setProperty('pointer-events', 'none', 'important');
      }
    }, 2500);
  }, [closeOtherAssistants]);

  const openBooking = useCallback(() => {
    closeOtherAssistants('booking');
    void window.openFoxesBooking?.();
  }, [closeOtherAssistants]);

  return (
    <div
      data-testid="assistants-page"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className="relative isolate overflow-hidden px-4 pb-20 pt-8 sm:px-6 sm:pb-24 sm:pt-16 lg:px-8"
    >
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_10%_10%,rgba(67,133,246,0.16),transparent_32%),radial-gradient(circle_at_90%_15%,rgba(124,58,237,0.12),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#f4f7fb_55%,#ffffff_100%)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-80 w-[44rem] -translate-x-1/2 rounded-full bg-white/80 blur-3xl" />

      <div className="mx-auto max-w-7xl">
        <header className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-700 shadow-sm backdrop-blur">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {copy.badge}
          </span>
          <h1 className="mt-5 text-balance text-4xl font-extrabold tracking-[-0.045em] text-slate-950 sm:mt-7 sm:text-5xl lg:text-6xl">
            {copy.title}
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-balance text-base leading-7 text-slate-600 sm:mt-6 sm:text-xl sm:leading-8">
            {copy.subtitle}
          </p>
          <p className="mx-auto mt-3 hidden max-w-2xl text-sm leading-6 text-slate-500 sm:block">{copy.intro}</p>
        </header>

        <section className="mt-8 grid gap-5 sm:mt-12 lg:mt-16 lg:grid-cols-3" aria-label={copy.badge}>
          {(['search', 'voice', 'booking'] as const).map((kind) => (
            <AssistantCard
              key={kind}
              kind={kind}
              copy={copy.cards[kind]}
              state={states[kind]}
              statusLabel={copy.status[states[kind]]}
              unavailableHelp={copy.unavailableHelp}
              onOpen={kind === 'search' ? openSearch : kind === 'voice' ? openVoice : openBooking}
            />
          ))}
        </section>

        <div className="mx-auto mt-8 grid max-w-4xl gap-3 rounded-[24px] border border-slate-200/80 bg-white/75 p-4 shadow-sm backdrop-blur sm:grid-cols-3 sm:p-5">
          {copy.footer.map((item, index) => {
            const Icon = index === 0 ? Search : index === 1 ? Headphones : ShieldCheck;
            return (
              <div key={item} className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-slate-600">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>{item}</span>
              </div>
            );
          })}
        </div>

        <p className="mx-auto mt-7 flex max-w-2xl items-start justify-center gap-2 text-center text-xs leading-5 text-slate-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          <span>{copy.privacy}</span>
        </p>
      </div>
    </div>
  );
}
