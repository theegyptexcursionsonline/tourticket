'use client';

import { Headphones, CalendarCheck, Languages, PhoneCall } from 'lucide-react';
import EEOVoiceConcierge from '@/components/EEOVoiceConcierge';

type VoiceCopy = {
  kicker: string;
  title: string;
  subtitle: string;
  cta: string;
  hint: string;
  features: { title: string; body: string }[];
};

const copy: Record<string, VoiceCopy> = {
  en: {
    kicker: 'AI voice concierge',
    title: 'Talk to Nile, your Egypt travel expert',
    subtitle:
      'Ask about tours, availability, prices, and pickup details out loud — Nile answers from the real Egypt Excursions Online catalog, in English or Arabic.',
    cta: 'Start a voice chat',
    hint: 'Or tap the voice bubble in the corner. Your browser will ask for microphone access.',
    features: [
      { title: 'Real catalog answers', body: 'Nile is grounded on our live tours and availability — it never invents prices or itineraries.' },
      { title: 'Book by voice', body: 'Reserve a tour, request a callback, or reach a human agent without typing a word.' },
      { title: 'English & Arabic', body: 'Speak in the language you think in — switch anytime, mid-conversation.' },
      { title: 'Always on', body: 'The concierge is available around the clock, on any device with a microphone.' },
    ],
  },
  ar: {
    kicker: 'مساعد صوتي بالذكاء الاصطناعي',
    title: 'تحدث مع نايل، خبير رحلاتك في مصر',
    subtitle:
      'اسأل بصوتك عن الرحلات والمواعيد والأسعار وتفاصيل الاستلام — يجيبك نايل من كتالوج Egypt Excursions Online الحقيقي، بالعربية أو الإنجليزية.',
    cta: 'ابدأ محادثة صوتية',
    hint: 'أو اضغط على فقاعة الصوت في الزاوية. سيطلب المتصفح إذن الميكروفون.',
    features: [
      { title: 'إجابات من الكتالوج الحقيقي', body: 'نايل يعتمد على رحلاتنا ومواعيدنا الفعلية — لا يخترع أسعارًا أو برامج.' },
      { title: 'احجز بصوتك', body: 'احجز رحلة أو اطلب مكالمة أو تواصل مع موظف حقيقي دون كتابة كلمة.' },
      { title: 'العربية والإنجليزية', body: 'تحدث باللغة التي تفكر بها — وبدّل بينهما في أي لحظة.' },
      { title: 'متاح دائمًا', body: 'المساعد متاح على مدار الساعة من أي جهاز به ميكروفون.' },
    ],
  },
  de: {
    kicker: 'KI-Sprachassistent',
    title: 'Sprechen Sie mit Nile, Ihrem Ägypten-Experten',
    subtitle:
      'Fragen Sie laut nach Touren, Verfügbarkeit, Preisen und Abholung — Nile antwortet aus dem echten Katalog von Egypt Excursions Online, auf Englisch oder Arabisch.',
    cta: 'Sprachchat starten',
    hint: 'Oder tippen Sie auf die Sprachblase in der Ecke. Ihr Browser fragt nach Mikrofonzugriff.',
    features: [
      { title: 'Echte Katalogantworten', body: 'Nile stützt sich auf unsere echten Touren und Termine — keine erfundenen Preise oder Routen.' },
      { title: 'Per Stimme buchen', body: 'Tour reservieren, Rückruf anfordern oder einen Menschen erreichen — ganz ohne Tippen.' },
      { title: 'Englisch & Arabisch', body: 'Sprechen Sie in Ihrer Sprache — Wechsel jederzeit möglich.' },
      { title: 'Rund um die Uhr', body: 'Der Concierge ist jederzeit erreichbar, auf jedem Gerät mit Mikrofon.' },
    ],
  },
  fr: {
    kicker: 'Concierge vocal IA',
    title: 'Parlez à Nile, votre expert voyage en Égypte',
    subtitle:
      'Demandez à voix haute les excursions, disponibilités, prix et prises en charge — Nile répond depuis le vrai catalogue Egypt Excursions Online, en anglais ou en arabe.',
    cta: 'Démarrer une conversation vocale',
    hint: 'Ou touchez la bulle vocale dans le coin. Votre navigateur demandera l’accès au micro.',
    features: [
      { title: 'Réponses du vrai catalogue', body: 'Nile s’appuie sur nos excursions et disponibilités réelles — jamais de prix inventés.' },
      { title: 'Réservez à la voix', body: 'Réservez une excursion, demandez un rappel ou parlez à un humain sans taper un mot.' },
      { title: 'Anglais & arabe', body: 'Parlez dans votre langue — changez à tout moment.' },
      { title: 'Toujours disponible', body: 'Le concierge répond 24h/24, sur tout appareil équipé d’un micro.' },
    ],
  },
  es: {
    kicker: 'Conserje de voz con IA',
    title: 'Habla con Nile, tu experto en viajes por Egipto',
    subtitle:
      'Pregunta en voz alta por tours, disponibilidad, precios y recogidas — Nile responde desde el catálogo real de Egypt Excursions Online, en inglés o árabe.',
    cta: 'Iniciar chat de voz',
    hint: 'O toca la burbuja de voz en la esquina. Tu navegador pedirá acceso al micrófono.',
    features: [
      { title: 'Respuestas del catálogo real', body: 'Nile se basa en nuestros tours y fechas reales — nunca inventa precios ni rutas.' },
      { title: 'Reserva con tu voz', body: 'Reserva un tour, pide que te llamemos o habla con una persona sin escribir nada.' },
      { title: 'Inglés y árabe', body: 'Habla en tu idioma y cámbialo cuando quieras.' },
      { title: 'Siempre disponible', body: 'El conserje está disponible a todas horas, en cualquier dispositivo con micrófono.' },
    ],
  },
};

const FEATURE_ICONS = [Headphones, CalendarCheck, Languages, PhoneCall];

export default function VoicePageContent({ locale }: { locale: string }) {
  const localized = copy[locale] || copy.en;

  const openVoiceWidget = () => {
    // The hosted bundle exposes a queued command API; open works as soon as the
    // frame is ready even if the visitor clicks immediately after page load.
    window.foxes?.('open');
  };

  return (
    <main className="bg-white">
      <section className="relative overflow-hidden bg-slate-900 px-4 py-24 text-center text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.35), transparent 65%)' }}
        />
        <div className="relative z-10 mx-auto max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">{localized.kicker}</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">{localized.title}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-300">{localized.subtitle}</p>
          <button
            type="button"
            onClick={openVoiceWidget}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400"
          >
            <Headphones className="h-5 w-5" aria-hidden />
            {localized.cta}
          </button>
          <p className="mt-4 text-sm text-slate-400">{localized.hint}</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-16 sm:grid-cols-2">
        {localized.features.map((feature, index) => {
          const Icon = FEATURE_ICONS[index] || Headphones;
          return (
            <div key={feature.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <Icon className="h-7 w-7 text-emerald-600" aria-hidden />
              <h2 className="mt-3 text-lg font-bold text-slate-900">{feature.title}</h2>
              <p className="mt-2 text-slate-600">{feature.body}</p>
            </div>
          );
        })}
      </section>

      <EEOVoiceConcierge forceMount />
    </main>
  );
}
