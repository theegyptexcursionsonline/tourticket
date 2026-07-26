import fs from 'node:fs';
import path from 'node:path';

describe('tour overview width contract', () => {
  it('lets the rich description use the full available content column', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app', '[locale]', '[slug]', 'TourDetailClientPage.tsx'),
      'utf8',
    );

    expect(source).toContain('prose prose-slate w-full max-w-none');
  });
});
