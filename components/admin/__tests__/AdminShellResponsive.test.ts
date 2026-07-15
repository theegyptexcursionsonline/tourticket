import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('admin shell responsive layout', () => {
  it('removes the mobile drawer from flex layout while it is off-canvas', () => {
    const sidebar = source('components/admin/Sidebar.tsx');

    expect(sidebar).toContain(': "relative lg:sticky lg:top-0"');
    expect(sidebar).not.toContain('className={`relative bg-white');
    expect(sidebar).toContain('aria-label={isMobileOpen ? "Close admin navigation" : "Open admin navigation"}');
    expect(sidebar).toContain('z-[70]');
  });

  it('keeps narrow headers focused on accessible navigation and session controls', () => {
    const header = source('components/admin/Header.tsx');

    expect(header).toContain('hidden min-w-0 items-center space-x-1 sm:flex');
    expect(header).toContain('relative hidden sm:block');
    expect(header).toContain('aria-label="Log out"');
  });

  it('keeps booking controls usable at phone widths and wires CSV export', () => {
    const bookings = source('app/admin/bookings/BookingsPageClient.tsx');
    const csv = source('lib/admin/csv.ts');

    expect(bookings).toContain('grid w-full grid-cols-2');
    expect(bookings).toContain('min-[480px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]');
    expect(bookings).toContain('onClick={handleExport}');
    expect(bookings).toContain('toSafeCsvCell');
    expect(csv).toContain('/^\\s*[=+\\-@]/');
  });
});
