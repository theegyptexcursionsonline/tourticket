import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('single storefront AI widget contract', () => {
  it('mounts AI Search without loading a second support or chat runtime', () => {
    const layout = readFileSync(
      path.join(process.cwd(), 'app/[locale]/layout.tsx'),
      'utf8',
    );

    expect(layout).toContain('<EEOSearchConcierge />');
    expect(layout).not.toContain('connect.foxestechnology.com/embed.js');
    expect(layout).not.toContain('<DeferredIntercom');
    expect(layout).not.toContain('<Chatbot');
  });

  it.each([
    'components/Footer.tsx',
    'components/TourDetailPage.tsx',
    'app/[locale]/[slug]/TourDetailClientPage.tsx',
    'app/[locale]/contact/ContactClientPage.tsx',
  ])('routes %s conversational entry points through hosted AI Search', (file) => {
    const source = readFileSync(path.join(process.cwd(), file), 'utf8');

    expect(source).toContain('requestHostedAISearch');
    expect(source).not.toContain('window.FoxesConnect');
    expect(source).not.toContain("new CustomEvent('open-chatbot')");
    expect(source).not.toContain('Chat with us');
    expect(source).not.toContain('Live Chat');
    expect(source).not.toContain('Instant support');
  });
});
