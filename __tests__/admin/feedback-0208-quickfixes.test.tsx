/**
 * Client sheet 02.08 quick fixes:
 *  - #17: category rows must return to the Pages list WITH the active filters —
 *    CategoryForm navigates via router.back() like the attraction editor,
 *    never a bare push that drops the query string.
 *  - N7: the tours table category cell stays flat regardless of how many
 *    categories a tour carries (first two + "+N" counter).
 */
import fs from 'fs';
import path from 'path';
import { render, screen } from '@testing-library/react';
import { CategoryCell, getCategoryList } from '@/app/admin/tours/ToursListClient';

const cat = (name: string) => ({ _id: name, name });

describe('tours table category cell (N7)', () => {
  it('lists every category when there are two or fewer', () => {
    render(<CategoryCell tour={{ category: [cat('Desert Safaris'), cat('Quad Tours')] } as any} />);
    expect(screen.getByText('Desert Safaris, Quad Tours')).toBeInTheDocument();
    expect(screen.queryByText(/^\+/)).toBeNull();
  });

  it('collapses beyond two categories into a +N counter with the full list on hover', () => {
    const tour = {
      category: [cat('Cultural Tours'), cat('Group Tours'), cat('City Tours'), cat('Family'), cat('Camel Rides')],
    } as any;
    render(<CategoryCell tour={tour} />);
    expect(screen.getByText('Cultural Tours, Group Tours')).toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument();
    expect(screen.queryByText(/Camel Rides/)).toBeNull();
    expect(
      screen.getByTitle('Cultural Tours, Group Tours, City Tours, Family, Camel Rides'),
    ).toBeInTheDocument();
  });

  it('shows N/A when a tour has no categories', () => {
    render(<CategoryCell tour={{} as any} />);
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('handles single-object category values', () => {
    expect(getCategoryList({ category: cat('Nile Cruises') } as any)).toEqual(['Nile Cruises']);
  });
});

describe('CategoryForm back navigation keeps list filters (#17)', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'components/admin/CategoryForm.tsx'),
    'utf8',
  );

  it('never pushes a bare /admin/pages URL', () => {
    expect(source).not.toContain("router.push('/admin/pages')");
  });

  it('uses history back for both the arrow and Cancel', () => {
    expect(source.match(/router\.back\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('includes the visible SEO keyword draft when Save is clicked directly', () => {
    expect(source).toContain('normalizeCategoryKeywords(\n      formData.keywords,\n      keywordDraft,');
    expect(source).toContain('keywords: keywordsForSave');
    expect(source).toContain('value={keywordDraft}');
  });
});
