import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Category available tours surface', () => {
  const source = readFileSync(
    join(process.cwd(), 'app/[locale]/categories/[slug]/CategoryPageClient.tsx'),
    'utf8',
  );

  it('owns a light, high-contrast surface across every page template', () => {
    expect(source).toContain('aria-labelledby="available-tours-heading"');
    expect(source).toContain('className="border-y border-slate-200 bg-white py-12 text-slate-900"');
    expect(source).toContain('id="available-tours-heading" className="text-3xl font-bold text-slate-900');
  });
});
