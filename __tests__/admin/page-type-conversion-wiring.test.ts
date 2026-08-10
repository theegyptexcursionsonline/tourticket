import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('admin page type conversion wiring', () => {
  it('exposes the safe transfer control from both underlying page editors', () => {
    expect(read('components/admin/CategoryForm.tsx')).toContain(
      '<PageTypeConversionActions pageId={categoryId} currentKind="category" />',
    );
    const attractionForm = read('components/admin/AttractionPageForm.tsx');
    expect(attractionForm).toContain('<PageTypeConversionActions');
    expect(attractionForm).toContain("formData.pageType === 'category' ? 'category-landing' : 'attraction'");
  });

  it('keeps the source page unchanged and creates an unpublished target draft', () => {
    const route = read('app/api/admin/pages/convert/route.ts');
    expect(route).toContain("permissions: ['manageContent']");
    expect(route).toContain('archivedAt: null');
    expect(route).toContain('createUniqueDuplicate({');
    expect(route).not.toContain('findOneAndDelete');
    expect(route).not.toContain('deleteOne');
    expect(route).not.toContain('updateMany');
  });
});
