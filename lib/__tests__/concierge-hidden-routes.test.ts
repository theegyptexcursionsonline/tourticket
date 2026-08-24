import { readFileSync } from 'node:fs';
import path from 'node:path';

/** The launcher stays off single-CTA and transactional surfaces. */
describe('search concierge hidden routes', () => {
  const source = readFileSync(path.join(process.cwd(), 'components/EEOSearchConcierge.tsx'), 'utf8');
  const hidden = source.match(/const HIDDEN_ROUTES = \[([\s\S]*?)\];/)?.[1] ?? '';

  it.each(['/offer', '/checkout', '/booking', '/payment', '/admin', '/login', '/signup', '/tools'])(
    'suppresses the launcher on %s', (route) => {
      expect(hidden).toContain(`'${route}'`);
    },
  );
});
