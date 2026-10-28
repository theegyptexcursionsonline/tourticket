import { readdirSync, readFileSync } from 'node:fs';
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
    'app/[locale]/[slug]/TourDetailClientPage.tsx',
    'app/[locale]/contact/ContactClientPage.tsx',
    'app/[locale]/destinations/DestinationsClientPage.tsx',
    'components/Header.tsx',
  ])('%s conversational entry points stay on hosted AI Search', (file) => {
    const source = readFileSync(path.join(process.cwd(), file), 'utf8');
    expect(source).toMatch(/\b(ask|request)HostedAISearch\(/);
    expect(source).not.toContain('window.FoxesConnect');
  });

  // The Algolia agent was retired with Algolia (21 Aug); its chats answered with
  // an empty bubble (header search, /destinations). Only these legacy files still
  // name it, and none of them is rendered.
  const LEGACY_AGENT_FILES = [
    'components/AIAgentModal.tsx',
    'components/HeroSection.tsx',
    'components/InterestGridServer.tsx',
    'app/[locale]/destinations/[slug]/DestinationPageClient.tsx',
  ];

  function* sourceFiles(dir: string): Generator<string> {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '__tests__' || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) yield* sourceFiles(full);
      else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) yield full;
    }
  }

  it('no rendered storefront code calls the retired Algolia agent', () => {
    const callers: string[] = [];
    const importsOfLegacy: string[] = [];
    for (const dir of ['app', 'components', 'contexts', 'hooks', 'lib']) {
      for (const file of sourceFiles(path.join(process.cwd(), dir))) {
        const rel = path.relative(process.cwd(), file);
        const source = readFileSync(file, 'utf8');
        if (source.includes('agent-studio')) callers.push(rel);
        if (/from ['"]@\/components\/(AIAgentModal|HeroSection|InterestGridServer)['"]/.test(source)) importsOfLegacy.push(rel);
      }
    }
    expect(callers.sort()).toEqual([...LEGACY_AGENT_FILES].sort());
    expect(importsOfLegacy).toEqual([]);
    const destinationPage = readFileSync(path.join(process.cwd(), LEGACY_AGENT_FILES[3]), 'utf8');
    expect(destinationPage).not.toContain('<LegacyHeroSearchBar');
  });
});
