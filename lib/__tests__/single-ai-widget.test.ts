import { readFileSync } from 'node:fs';
import path from 'node:path';

// Storefront assistant contract (updated 2026-08-21, client request 19-20/08):
// AI Search stays the ONLY floating launcher, and the FoxesConnect support
// widget is the separate PLAIN support entry — loaded with a hidden launcher
// and opened solely from the footer "Chat with us" link. Exactly one instance
// of each; no third chat runtime.
describe('storefront assistant contract', () => {
  const layout = readFileSync(
    path.join(process.cwd(), 'app/[locale]/layout.tsx'),
    'utf8',
  );

  it('mounts AI Search plus the hidden-launcher support embed, and nothing else', () => {
    expect(layout).toContain('<EEOSearchConcierge />');
    expect(layout.match(/connect\.foxestechnology\.com\/embed\.js/g)).toHaveLength(1);
    expect(layout).toContain("data-launcher','none'");
    expect(layout).not.toContain('<DeferredIntercom');
    expect(layout).not.toContain('<Chatbot');
  });

  it('footer "Chat with us" opens the support widget, not the AI surface', () => {
    const source = readFileSync(path.join(process.cwd(), 'components/Footer.tsx'), 'utf8');
    expect(source).toContain('FoxesConnect');
    expect(source).not.toContain('requestHostedAISearch');
  });

  it.each([
    'components/TourDetailPage.tsx',
    'app/[locale]/[slug]/TourDetailClientPage.tsx',
    'app/[locale]/contact/ContactClientPage.tsx',
  ])('%s conversational entry points stay on hosted AI Search', (file) => {
    const source = readFileSync(path.join(process.cwd(), file), 'utf8');
    expect(source).toContain('requestHostedAISearch');
    expect(source).not.toContain('window.FoxesConnect');
  });
});
