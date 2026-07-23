/**
 * Regression: storefront listings emitted hardcoded `/tour/<slug>` hrefs, so
 * every tour click visibly opened the legacy path and 301'd to the canonical
 * URL (client-reported 2026-07-23, issue #78). Internal links and JSON-LD must
 * derive tour URLs from contentPath()/the item's urlType instead — the only
 * places allowed to reference the literal segment are the URL-type system
 * itself and the legacy routes that serve/redirect it.
 */

import * as fs from 'fs';
import * as path from 'path';

import { contentPath } from '@/lib/content/contentUrl';

const ROOT = path.join(__dirname, '..', '..');

function* walk(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\./.test(entry.name)) yield full;
  }
}

// Files that legitimately reference the literal `/tour/` segment.
const ALLOWED = [
  path.join('lib', 'content', 'contentUrl.ts'), // the urlType mapping itself
  path.join('app', '[locale]', 'tour', '[slug]'), // the legacy route that serves/redirects it
  path.join('app', 'api', 'admin', 'availability', 'route.ts'), // revalidates the legacy route
];

describe('no hardcoded legacy /tour/ links', () => {
  it('storefront code derives tour URLs from contentPath, never a literal /tour/${slug}', () => {
    const offenders: string[] = [];
    for (const dir of ['components', 'app', 'lib', 'hooks']) {
      const abs = path.join(ROOT, dir);
      if (!fs.existsSync(abs)) continue;
      for (const file of walk(abs)) {
        const rel = path.relative(ROOT, file);
        if (ALLOWED.some((a) => rel.startsWith(a))) continue;
        const src = fs.readFileSync(file, 'utf8');
        if (/[`'"]\/tour\/\$\{|[`'"]\/tour\/[a-z0-9]/.test(src) && !src.includes('.bak')) {
          offenders.push(rel);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('contentPath keeps tours at the root by default and honors an explicit urlType', () => {
    expect(contentPath('tour', 'nile-cruise', undefined)).toBe('/nile-cruise');
    expect(contentPath('tour', 'nile-cruise', 'default')).toBe('/nile-cruise');
    expect(contentPath('tour', 'nile-cruise', 'tour')).toBe('/tour/nile-cruise');
    expect(contentPath('tour', 'nile-cruise', 'experience')).toBe('/experience/nile-cruise');
  });
});
