import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import LinkedPageCardsSection from '@/components/content/LinkedPageCardsSection';
import ContentListingPicker from '@/components/admin/ContentListingPicker';

jest.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, src, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt || ''} src={String(src)} {...props} />
  ),
}));

describe('Category other page listings', () => {
  it('renders the editor-defined title, subtitle, and linked card destination', () => {
    render(
      <LinkedPageCardsSection
        title="Continue exploring"
        subtitle="Selected by the EEO team"
        pages={[{
          id: 'page-1',
          title: 'Luxor highlights',
          description: 'A guide to the city highlights.',
          image: '/luxor.jpg',
          href: '/luxor-highlights',
          kind: 'page',
        }]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Continue exploring' })).toBeInTheDocument();
    expect(screen.getByText('Selected by the EEO team')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Luxor highlights/ })).toHaveAttribute('href', '/luxor-highlights');
  });

  it('does not render an empty listings section', () => {
    const { container } = render(<LinkedPageCardsSection pages={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lets an editor remove an already-selected page', () => {
    const onChange = jest.fn();
    render(
      <ContentListingPicker
        label="Pages and categories"
        hint="Choose related pages"
        placeholder="Search pages"
        optionsKind="pages"
        selected={[{ id: 'page-1', title: 'Luxor highlights', kind: 'attraction' }]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Remove Luxor highlights' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('wires the Category editor, API validation, and storefront resolver', () => {
    const categoryForm = readFileSync(join(process.cwd(), 'components/admin/CategoryForm.tsx'), 'utf8');
    const categoryRoute = readFileSync(join(process.cwd(), 'app/api/categories/[id]/route.ts'), 'utf8');
    const storefront = readFileSync(join(process.cwd(), 'app/[locale]/categories/[slug]/CategoryDetailContent.tsx'), 'utf8');

    expect(categoryForm).toContain('ContentListingPicker');
    expect(categoryForm).toContain('linkedPagesTitle');
    expect(categoryForm).toContain('linkedPagesSubtitle');
    expect(categoryRoute).toContain('currentCategoryId: id');
    expect(categoryRoute).toContain('includeTours: false');
    expect(storefront).toContain('resolveLinkedPageCards(category, locale)');
    expect(storefront).toContain('Promise.all([');
  });
});
