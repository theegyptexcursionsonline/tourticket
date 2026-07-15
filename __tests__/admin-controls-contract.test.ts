import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('main EEO admin control contracts', () => {
  it('wires the booking-detail Export button to the CSV handler', () => {
    const source = read('app/admin/bookings/[id]/page.tsx');
    expect(source).toContain('const handleExport = () =>');
    expect(source).toContain('onClick={handleExport}');
    expect(source).toContain('toSafeCsvCell');
  });

  it('loads manifest tour choices from the lightweight options endpoint', () => {
    const source = read('app/admin/manifests/page.tsx');
    expect(source).toContain("fetch('/api/admin/tours/options'");
    expect(source).not.toContain("fetch('/api/admin/tours',");
  });
});
