import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AuthorCard, authorInitials } from '@/app/[locale]/blog/[slug]/AuthorCard';

jest.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, src, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt ?? ''} src={String(src)} {...props} />
  ),
}));

// M5 B3 (24 Oct 2026): the live article showed an empty grey avatar (a redirect to an
// outside avatar service that never loaded) and a "Contact author" button that opened an
// email with no address.
describe('article author card', () => {
  const team = { name: 'EEO Editorial Team', slug: 'eeo-editorial-team' };

  it('draws local initials when the article has no portrait and asks no outside service', () => {
    const { container } = render(<AuthorCard author={team} />);
    expect(screen.getByTestId('author-avatar-fallback')).toHaveTextContent('EEO');
    expect(screen.getByTestId('author-avatar-fallback')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toContain('/api/avatars');
  });

  it('shows a real portrait, silent for screen readers, and falls back when it fails to load', () => {
    const { container } = render(
      <AuthorCard author={{ ...team, name: 'Mona Hassan', avatar: 'https://res.cloudinary.com/eeo/image/upload/mona.jpg' }} />,
    );
    const image = container.querySelector('img');
    expect(image).not.toBeNull();
    expect(image).toHaveAttribute('alt', '');
    expect(screen.queryByTestId('author-avatar-fallback')).toBeNull();
    fireEvent.error(image!);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByTestId('author-avatar-fallback')).toHaveTextContent('MH');
  });

  it.each([
    ['javascript:alert(1)'],
    ['http://insecure.example/portrait.jpg'],
    ['//protocol-relative.example/p.jpg'],
    ['   '],
  ])('never loads %p as a portrait', (avatar) => {
    const { container } = render(<AuthorCard author={{ ...team, avatar }} />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByTestId('author-avatar-fallback')).toBeInTheDocument();
  });

  it('offers no empty email action, even when an address is present on the profile', () => {
    for (const email of [undefined, '', 'editor@egypt-excursionsonline.com']) {
      const { container, unmount } = render(<AuthorCard author={{ ...team, email }} />);
      expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
      expect(screen.queryByText(/contact author/i)).toBeNull();
      unmount();
    }
  });

  it('links the name and "More articles" to the author page', () => {
    render(<AuthorCard author={team} />);
    expect(screen.getByRole('link', { name: 'EEO Editorial Team' })).toHaveAttribute('href', '/author/eeo-editorial-team');
    expect(screen.getByRole('link', { name: /more articles/i })).toHaveAttribute('href', '/author/eeo-editorial-team');
  });

  it.each([
    ['EEO Editorial Team', 'EEO'],
    ['Mona Hassan', 'MH'],
    ['élodie durand', 'ÉD'],
    ['مريم أحمد', 'مأ'],
    ['Single', 'S'],
    ['  ', ''],
    [undefined, ''],
  ])('initials for %p are %p', (name, initials) => {
    expect(authorInitials(name)).toBe(initials);
  });

  it('shows a person icon when the name has no letters to use', () => {
    render(<AuthorCard author={{ name: '   ' }} />);
    const fallback = screen.getByTestId('author-avatar-fallback');
    expect(fallback.textContent).toBe('');
    expect(fallback.querySelector('svg')).not.toBeNull();
  });
});

describe('article standfirst layout', () => {
  const source = readFileSync(join(process.cwd(), 'app/[locale]/blog/[slug]/BlogPostClient.tsx'), 'utf8');

  it('gives the standfirst the full phone width and puts the actions on their own row', () => {
    expect(source).toContain('flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6');
    expect(source).toMatch(/blog-standfirst blog-serif min-w-0/);
    // Logical sides, so the rule and the share menu follow an Arabic page to the right.
    expect(source).toMatch(/blog-standfirst[^"]*border-s-4[^"]*ps-5/);
    expect(source).toContain('start-0 z-40 mt-2 w-44');
    expect(source).not.toContain('<div className="flex items-start justify-between gap-6">');
  });

  it('keeps one author card and 44 px share and like targets', () => {
    expect(source.match(/<AuthorCard /g)).toHaveLength(1);
    expect(source).not.toContain('function AuthorCard');
    expect(source.match(/min-h-11/g)?.length).toBeGreaterThanOrEqual(5);
  });
});
