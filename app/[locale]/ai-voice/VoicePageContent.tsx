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
      'Ask about Egypt tours and pickup details out loud. Choose an available language in the assistant, then explore your options with Nile.',
    cta: 'Start a voice chat',
    hint: 'Or tap the voice bubble in the corner. Your browser will ask for microphone access.',
    features: [
      { title: 'Real catalog answers', body: 'Explore our published tour information. Confirm current prices and availability on the booking page before you pay.' },
      { title: 'Plan by voice', body: 'Ask follow-up questions to narrow your choices, then continue to the booking page for your selected tour.' },
      { title: 'Available languages', body: 'The assistant shows which languages are ready. Choose one before starting your conversation.' },
      { title: 'Voice or text', body: 'Use your microphone for a voice conversation, or choose text to type your question.' },
    ],
  },
  ar: {
    kicker: 'مساعد صوتي بالذكاء الاصطناعي',
    title: 'تحدث مع نايل، خبير رحلاتك في مصر',
    subtitle:
      'اسأل بصوتك عن رحلات مصر وتفاصيل الاستلام. اختر إحدى اللغات المتاحة في المساعد، ثم استكشف خياراتك مع نايل.',
    cta: 'ابدأ محادثة صوتية',
    hint: 'أو اضغط على فقاعة الصوت في الزاوية. سيطلب المتصفح إذن الميكروفون.',
    features: [
      { title: 'إجابات من الكتالوج الحقيقي', body: 'استكشف معلومات الرحلات المنشورة لدينا. تأكد من الأسعار الحالية والتوافر في صفحة الحجز قبل الدفع.' },
      { title: 'خطط بصوتك', body: 'اطرح أسئلة إضافية لاختيار رحلتك، ثم انتقل إلى صفحة الحجز لإتمام الخطوات.' },
      { title: 'اللغات المتاحة', body: 'يعرض المساعد اللغات الجاهزة للاستخدام. اختر إحداها قبل بدء المحادثة.' },
      { title: 'صوت أو كتابة', body: 'استخدم الميكروفون للمحادثة الصوتية أو اختر المحادثة النصية لكتابة سؤالك.' },
    ],
  },
  de: {
    kicker: 'KI-Sprachassistent',
    title: 'Sprechen Sie mit Nile, Ihrem Ägypten-Experten',
    subtitle:
      'Fragen Sie nach Ägypten-Touren und Abholung. Wählen Sie im Assistenten eine verfügbare Sprache und entdecken Sie Ihre Möglichkeiten mit Nile.',
    cta: 'Sprachchat starten',
    hint: 'Oder tippen Sie auf die Sprachblase in der Ecke. Ihr Browser fragt nach Mikrofonzugriff.',
    features: [
      { title: 'Echte Katalogantworten', body: 'Entdecken Sie unsere veröffentlichten Tourinformationen. Prüfen Sie aktuelle Preise und Verfügbarkeit vor der Zahlung auf der Buchungsseite.' },
      { title: 'Per Stimme planen', body: 'Stellen Sie weitere Fragen, um Ihre Auswahl einzugrenzen. Buchen Sie die gewählte Tour anschließend auf der Buchungsseite.' },
      { title: 'Verfügbare Sprachen', body: 'Der Assistent zeigt die einsatzbereiten Sprachen. Wählen Sie eine davon vor Gesprächsbeginn.' },
      { title: 'Sprache oder Text', body: 'Nutzen Sie Ihr Mikrofon für ein Sprachgespräch oder stellen Sie Ihre Frage per Text.' },
    ],
  },
  fr: {
    kicker: 'Concierge vocal IA',
    title: 'Parlez à Nile, votre expert voyage en Égypte',
    subtitle:
      'Posez vos questions sur les excursions et les prises en charge en Égypte. Choisissez une langue disponible dans l’assistant, puis explorez vos options avec Nile.',
    cta: 'Démarrer une conversation vocale',
    hint: 'Ou touchez la bulle vocale dans le coin. Votre navigateur demandera l’accès au micro.',
    features: [
      { title: 'Réponses du vrai catalogue', body: 'Explorez nos informations publiées sur les excursions. Confirmez les prix actuels et les disponibilités sur la page de réservation avant de payer.' },
      { title: 'Préparez votre visite à la voix', body: 'Affinez votre choix en posant des questions, puis poursuivez sur la page de réservation de votre excursion.' },
      { title: 'Langues disponibles', body: 'L’assistant indique les langues disponibles. Choisissez-en une avant de commencer la conversation.' },
      { title: 'Voix ou texte', body: 'Utilisez votre micro pour parler ou choisissez le texte pour écrire votre question.' },
    ],
  },
  es: {
    kicker: 'Conserje de voz con IA',
    title: 'Habla con Nile, tu experto en viajes por Egipto',
    subtitle:
      'Pregunta por excursiones y recogidas en Egipto. Elige un idioma disponible en el asistente y explora tus opciones con Nile.',
    cta: 'Iniciar chat de voz',
    hint: 'O toca la burbuja de voz en la esquina. Tu navegador pedirá acceso al micrófono.',
    features: [
      { title: 'Respuestas del catálogo real', body: 'Consulta la información publicada de nuestras excursiones. Confirma los precios actuales y la disponibilidad en la página de reserva antes de pagar.' },
      { title: 'Planifica con tu voz', body: 'Haz preguntas para elegir tu excursión y continúa en su página de reserva.' },
      { title: 'Idiomas disponibles', body: 'El asistente muestra los idiomas disponibles. Elige uno antes de empezar la conversación.' },
      { title: 'Voz o texto', body: 'Usa el micrófono para conversar o elige texto para escribir tu pregunta.' },
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
