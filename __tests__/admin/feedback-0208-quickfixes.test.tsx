/**
 * Client sheet 02.08 quick fixes:
 *  - #17: category rows must return to the Pages list WITH the active filters —
 *    CategoryForm navigates via router.back() like the attraction editor,
 *    never a bare push that drops the query string.
 *  - N7: multi-category tour rows stay compact by default and disclose their
 *    complete category list only when an editor opens the cell.
 */
import fs from 'fs';
import path from 'path';
import { fireEvent, render, screen } from '@testing-library/react';
import { CategoryCell, getCategoryList } from '@/app/admin/tours/ToursListClient';

const cat = (name: string) => ({ _id: name, name });

describe('tours table category cell (N7)', () => {
  it('shows one selected category without a disclosure control', () => {
    render(<CategoryCell tour={{ category: cat('Desert Safaris') } as any} />);
    expect(screen.getByText('Desert Safaris')).toBeInTheDocument();
    expect(screen.queryByRole('group')).toBeNull();
  });

  it('keeps multiple categories collapsed by default and expands the full list on demand', () => {
    const tour = {
      category: [cat('Cultural Tours'), cat('Group Tours'), cat('City Tours'), cat('Family'), cat('Camel Rides')],
    } as any;
    render(<CategoryCell tour={tour} />);
    const summary = screen.getByText('5 categories');
    const details = summary.closest('details');

    expect(details).not.toHaveAttribute('open');
    expect(screen.getByText('Camel Rides')).not.toBeVisible();
    fireEvent.click(summary);
    expect(details).toHaveAttribute('open');
    expect(screen.getByText('Camel Rides')).toBeVisible();
    expect(details).toHaveAttribute('title', 'Cultural Tours, Group Tours, City Tours, Family, Camel Rides');
  });

  it('shows N/A when a tour has no categories', () => {
    render(<CategoryCell tour={{} as any} />);
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('handles single-object category values', () => {
    expect(getCategoryList({ category: cat('Nile Cruises') } as any)).toEqual(['Nile Cruises']);
  });

  it('keeps table columns stable and allows long tour titles to wrap', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/admin/tours/ToursListClient.tsx'),
      'utf8',
    );

    expect(source).toContain('className="w-full min-w-[960px] table-fixed"');
    expect(source).toContain('whitespace-normal break-words text-sm font-semibold leading-5');
    const tableBlock = source.slice(
      source.indexOf('// Enhanced Table View'),
      source.indexOf('// Enhanced Cards View'),
    );
    expect(tableBlock).not.toContain(' truncate ');
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
