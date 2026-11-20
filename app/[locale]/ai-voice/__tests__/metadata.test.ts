import { generateMetadata } from '../page';

jest.mock('@/components/Header', () => () => null);
jest.mock('@/components/Footer', () => () => null);
jest.mock('../VoicePageContent', () => () => null);

describe('Voice page discovery metadata', () => {
  it('keeps language readiness truthful in English', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'en' }) });
    expect(metadata.title).toBe('AI Voice Concierge — Talk to Nile | Egypt Excursions Online');
    expect(metadata.description).toContain('Choose an available language');
    expect(metadata.description).toContain('confirm prices and availability when booking');
    expect(metadata.openGraph?.description).toContain('languages available in the assistant');
    expect(metadata.alternates?.canonical).toContain('/ai-voice');
  });

  it('gives the Arabic page an Arabic title and description', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'ar' }) });
    expect(metadata.title).toContain('تحدث مع نايل');
    expect(metadata.description).toContain('اختر لغة متاحة');
    expect(String(metadata.description)).not.toMatch(/[A-Za-z]{4,}/);
    expect(metadata.openGraph?.title).toContain('المساعد الصوتي');
    expect(metadata.alternates?.canonical).toContain('/ar/ai-voice');
  });

  it.each(['de', 'fr', 'es'])('never falls back to the English title for %s', async locale => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale }) });
    expect(metadata.title).not.toContain('AI Voice Concierge');
    expect(metadata.description).not.toContain('Choose an available language');
    expect(metadata.title).toContain('Nile');
    expect(metadata.alternates?.canonical).toContain(`/${locale}/ai-voice`);
  });
});
