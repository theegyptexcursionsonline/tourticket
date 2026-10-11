import { generateMetadata } from '../page';

jest.mock('@/components/Header', () => () => null);
jest.mock('@/components/Footer', () => () => null);
jest.mock('../VoicePageContent', () => () => null);

describe('Voice page discovery metadata', () => {
  it.each(['en', 'ar', 'de', 'fr', 'es'])('keeps language readiness truthful for %s discovery', async locale => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale }) });
    expect(metadata.description).toContain('Choose an available language');
    expect(metadata.description).toContain('confirm prices and availability when booking');
    expect(metadata.openGraph?.description).toContain('languages available in the assistant');
    expect(metadata.alternates?.canonical).toContain('/ai-voice');
  });
});
