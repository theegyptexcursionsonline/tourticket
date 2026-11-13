import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import BlogPostClient, { type BlogPost, type TourPreview } from '@/app/[locale]/blog/[slug]/BlogPostClient';
import BlogClientPage from '@/app/[locale]/blog/BlogClientPage';
import HomeBlogSection from '@/components/HomeBlogSection';
import { toBlogCard } from '@/lib/blog/blogCards';
import toast from 'react-hot-toast';
import { flattenMessages, messagesFor, strictTranslator } from '@/test-support/blogIntl';

let mockLocale = 'en';
jest.mock('next-intl', () => jest.requireActual('@/test-support/blogIntl').realIntl(() => mockLocale));

jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

// The sanitizer has its own tests; its parser cannot load in this runner, and the
// article body is not what these checks read.
jest.mock('@/lib/security/sanitizeHtml', () => ({ sanitizeRichHtml: (html: string) => html }));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, src }: { alt?: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt ?? ''} src={String(src)} />
  ),
}));

const mockToast = toast as unknown as { success: jest.Mock; error: jest.Mock };
const OTHER_LOCALES = ['ar', 'es', 'fr', 'de'];
const fetchMock = jest.fn();

function answer(status: number, body: Record<string, unknown>) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

/** What a visitor reads: the rendered text without the style sheet the article carries. */
function visibleText(container: HTMLElement): string {
  const copy = container.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('style').forEach((node) => node.remove());
  const attributes = Array.from(copy.querySelectorAll('[placeholder],[aria-label],[alt],[title]')).flatMap((node) =>
    ['placeholder', 'aria-label', 'alt', 'title'].map((name) => node.getAttribute(name) || ''),
  );
  return `${copy.textContent} ${attributes.join(' ')}`;
}

/** English blog wording with no value inside it: none of it may show on a page in another language. */
function englishLabels(prefixes: string[], locale: string): string[] {
  const english = flattenMessages((messagesFor('en') as Record<string, unknown>).blog, 'blog');
  const local = flattenMessages((messagesFor(locale) as Record<string, unknown>).blog, 'blog');
  return Object.entries(english)
    .filter(([key]) => prefixes.some((prefix) => key.startsWith(prefix)))
    .filter(([key, value]) => !/[{<]/.test(value) && local[key] !== value)
    .map(([, value]) => value);
}

const pricedTour: TourPreview = { _id: 't1', slug: 'giza-pyramids', title: 'Giza Pyramids Tour', duration: '8 hours', discountPrice: 35, price: 50 };
const bareTour: TourPreview = { _id: 't2', slug: 'nile-felucca', title: 'Nile Felucca Ride' };

const article: BlogPost = {
  _id: 'b1',
  slug: 'guide-excellence',
  title: 'Guide Excellence Program',
  excerpt: 'Strengthening professional standards.',
  content: '<h2>A new standard</h2><p>The body of the article.</p>',
  category: 'news-updates',
  featured: true,
  publishedDateText: 'Nov 12, 2026',
  readTime: 5,
  views: 5,
  likes: 2,
  tags: ['Egypt tour guides'],
  relatedTours: [pricedTour, bareTour],
  author: 'Team EEO',
  authorSlug: 'team-eeo',
};

const relatedPosts = [{ ...article, _id: 'b2', slug: 'nile-cruise', title: 'Nile Cruise for Couples', excerpt: 'Route advice.' }];

function renderArticle(overrides: Partial<BlogPost> = {}, tours: TourPreview[] = [pricedTour, bareTour]) {
  return render(<BlogPostClient blog={{ ...article, ...overrides }} relatedPosts={relatedPosts} relevantTours={tours} />);
}

beforeEach(() => {
  mockLocale = 'en';
  mockToast.success.mockReset();
  mockToast.error.mockReset();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(answer(200, { liked: false, likes: 2 }));
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('article page wording', () => {
  it('keeps its English wording', async () => {
    const { container } = renderArticle();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const text = visibleText(container);
    for (const label of [
      'Back to articles', 'Featured', '5 min read', '5 views', 'Share', 'Tags', "Tours you'll love", 'Browse all tours',
      'Related Articles', 'Book a Tour', 'Browse All Tours', 'Need urgent help?', 'Travel Essentials',
      'Passport & visa check', 'Comfortable walking shoes', 'Plan mornings & evenings', 'Get Trip Ideas',
      'Subscribe for the best Egypt tours & insider tips.', 'Your email', 'Subscribe', 'per person', 'More articles',
    ]) {
      expect(text).toContain(label);
    }
    expect(text).toContain('Nov 12, 2026');
    expect(text).toContain('+20 11 42255624');
  });

  it('names the category instead of printing its stored value', () => {
    const { container } = renderArticle();
    expect(screen.getByText('News & Updates')).toBeInTheDocument();
    expect(visibleText(container)).not.toMatch(/news-updates/i);
  });

  it('shows a real price and length, and nothing in place of a missing one', () => {
    const { container } = renderArticle();
    const text = visibleText(container);
    for (const invented of ['From $49', 'Half day', 'Day trip']) expect(text).not.toContain(invented);
    expect(screen.queryByText('Book')).toBeNull();

    // The priced tour shows up in the side panel and in the tour grid; the other in both without a figure.
    expect(screen.getAllByText('$35')).toHaveLength(2);
    expect(screen.getAllByText('8 hours')).toHaveLength(2);
    expect(screen.getAllByText('per person')).toHaveLength(1);
    for (const card of screen.getAllByText('Nile Felucca Ride').map((node) => node.closest('a')!)) {
      expect(card.textContent).toBe('Nile Felucca Ride');
    }
  });

  it('shows no read time when the post stores none', () => {
    const { container } = renderArticle({ readTime: undefined });
    expect(visibleText(container)).not.toMatch(/min read/);
  });

  it('says there are no linked tours without inventing one', () => {
    const { container } = renderArticle({ relatedTours: [] }, []);
    expect(visibleText(container)).toContain('No direct tours linked — browse all tours here.');
    expect(screen.getByRole('link', { name: 'here' })).toHaveAttribute('href', '/tours');
    expect(visibleText(container)).not.toContain("Tours you'll love");
  });

  it.each(OTHER_LOCALES)('leaves no English label on the %s page', async (locale) => {
    mockLocale = locale;
    const t = strictTranslator(locale, 'blog');
    const { container } = renderArticle();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const text = visibleText(container);

    for (const key of [
      'article.back', 'featured', 'article.share', 'article.tags', 'article.toursHeading', 'article.browseAllTours',
      'article.relatedHeading', 'article.perPerson', 'sidebar.bookTitle', 'sidebar.bookBody', 'sidebar.browseAll',
      'sidebar.urgentHelp', 'sidebar.essentialsTitle', 'sidebar.essentialPassport', 'sidebar.essentialShoes',
      'sidebar.essentialPlan', 'newsletter.title', 'newsletter.body', 'newsletter.emailPlaceholder', 'newsletter.submit',
      'newsletter.consent', 'author.moreArticles', 'categories.news-updates',
    ]) {
      expect(text).toContain(t(key));
    }
    expect(text).toContain(t('readTime', { count: 5, n: '5' }));
    expect(text).toContain(t('views', { count: 5, n: '5' }));

    const leftovers = englishLabels(['blog.article.', 'blog.sidebar.', 'blog.newsletter.', 'blog.author.', 'blog.featured'], locale)
      .filter((label) => text.includes(label));
    expect(leftovers).toEqual([]);
    expect(text).not.toMatch(/min read|\bviews\b|news-updates/i);
  });

  it('answers a like in the page language, whatever the route says', async () => {
    mockLocale = 'ar';
    const t = strictTranslator('ar', 'blog.article');
    renderArticle();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fetchMock.mockResolvedValueOnce(answer(200, { success: true, liked: true, replayed: false, likes: 3, message: 'Thanks for liking this post.' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: t('likeLabel', { n: '2' }) })); });
    expect(mockToast.success).toHaveBeenCalledWith(t('likeThanks'));
    expect(screen.getByRole('button', { name: t('likedLabel', { n: '3' }) })).toBeDisabled();
  });

  it.each([
    [429, 'likeTooMany'],
    [503, 'likeError'],
  ])('reports a refused like (%i) in the page language', async (status, key) => {
    mockLocale = 'de';
    const t = strictTranslator('de', 'blog.article');
    renderArticle();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fetchMock.mockResolvedValueOnce(answer(status, { success: false, error: 'Unable to save this like right now.' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: t('likeLabel', { n: '2' }) })); });
    expect(mockToast.error).toHaveBeenCalledWith(t(key));
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it('gives the partnership story its labels from the messages and keeps its figures', () => {
    const story = { slug: 'egypt-excursions-online-getyourguide-partnership', category: 'news-updates' };
    const english = renderArticle(story);
    const text = visibleText(english.container);
    for (const label of ['EEO stories', 'Success story', 'Partnership began', '15 years', 'Growing together', 'Growth in two years', '2011', '108%']) {
      expect(text).toContain(label);
    }
    expect(screen.getByLabelText('Partnership highlights')).toBeInTheDocument();
    english.unmount();

    mockLocale = 'ar';
    const arabic = visibleText(renderArticle(story).container);
    for (const label of ['قصة نجاح', 'قصص EEO', '15 عامًا', '2011', '108%']) expect(arabic).toContain(label);
    for (const label of ['Success story', 'EEO stories', 'Growing together']) expect(arabic).not.toContain(label);
  });
});

describe('blog list page wording', () => {
  const source = (overrides: Record<string, unknown>) => ({
    _id: 'p1',
    slug: 'guide-excellence',
    title: 'Guide Excellence Program',
    excerpt: 'Strengthening professional standards.',
    featuredImage: 'https://res.cloudinary.com/eeo/image/upload/philae.jpg',
    category: 'news-updates',
    featured: false,
    author: 'Team EEO',
    readTime: 5,
    views: 5,
    likes: 0,
    publishedAt: '2026-11-12T08:00:00.000Z',
    tags: ['Egypt tour guides'],
    translations: {
      ar: { title: 'برنامج التميّز للمرشدين', excerpt: 'تعزيز المعايير المهنية.' },
      fr: { title: "Programme d'excellence des guides", excerpt: 'Renforcer les normes professionnelles.' },
    },
    ...overrides,
  });
  const posts = [
    source({}),
    source({ _id: 'p2', slug: 'nile-cruise', title: 'Nile Cruise for Couples', excerpt: 'Route advice.', category: 'destination-guides', featured: true, translations: undefined }),
  ];
  const categories = [{ value: 'destination-guides', count: 1 }, { value: 'news-updates', count: 1 }];

  function renderList(locale: string, list = posts) {
    mockLocale = locale;
    const cards = list.map((post) => toBlogCard(post, locale));
    return render(<BlogClientPage blogs={cards} categories={list.length ? categories : []} featuredPosts={cards.filter((card) => card.featured)} />);
  }

  it('keeps its English wording, with the hero line now about Egypt', () => {
    const text = visibleText(renderList('en').container);
    for (const label of [
      'Travel Stories & Insights', 'Search articles, destinations, tips...', 'Featured Stories', 'Categories',
      'All Articles (2)', 'Popular Tags', 'Latest Articles', '2 articles', '5 min read', 'Featured', '11/12/2026',
    ]) {
      expect(text).toContain(label);
    }
    expect(text).toContain('Discover amazing destinations, travel tips, and cultural experiences from across Egypt');
    expect(text).not.toContain('around the world');
    // The card badge used to read "News Updates" beside a filter that read "News & Updates".
    expect(screen.getAllByText('News & Updates').length).toBeGreaterThanOrEqual(2);
    expect(text).not.toContain('News Updates');
  });

  it.each(OTHER_LOCALES)('reads in %s with no English label left', (locale) => {
    const t = strictTranslator(locale, 'blog');
    const text = visibleText(renderList(locale).container);
    for (const key of ['list.title', 'list.subtitle', 'list.searchPlaceholder', 'list.featuredHeading', 'list.categoriesHeading', 'list.popularTags', 'list.latestHeading', 'featured', 'categories.news-updates', 'categories.destination-guides']) {
      expect(text).toContain(t(key));
    }
    expect(text).toContain(t('list.allArticles', { count: '2' }));
    expect(text).toContain(t('list.articleCount', { count: 2, n: '2' }));
    expect(englishLabels(['blog.list.', 'blog.featured'], locale).filter((label) => text.includes(label))).toEqual([]);
    expect(text).not.toMatch(/min read|News Updates|Destination Guides/);
    expect(text).not.toMatch(/[٠-٩۰-۹]/);
  });

  it('shows a card in the language of the visitor when the post is translated, in English when it is not', () => {
    renderList('ar');
    expect(screen.getByText('برنامج التميّز للمرشدين')).toBeInTheDocument();
    expect(screen.getByText('تعزيز المعايير المهنية.')).toBeInTheDocument();
    expect(screen.queryByText('Guide Excellence Program')).toBeNull();
    // The second post has no translation: its English title stays, on the card and the featured card.
    expect(screen.getAllByText('Nile Cruise for Couples')).toHaveLength(2);
  });

  it('searches the translated title and names the chosen category', () => {
    const t = strictTranslator('fr', 'blog');
    renderList('fr');
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t('categories.news-updates')) }));
    expect(screen.getByRole('heading', { level: 2, name: t('list.categoryHeading', { category: t('categories.news-updates') }) })).toBeInTheDocument();
    expect(screen.getByText(t('list.articleCount', { count: 1, n: '1' }))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: t('list.allArticles', { count: '2' }) }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'excellence des guides' } });
    expect(screen.getByText("Programme d'excellence des guides")).toBeInTheDocument();
    expect(screen.getByText(t('list.articleCount', { count: 1, n: '1' }))).toBeInTheDocument();
  });

  it('tells a search with no result apart from a blog with no posts', () => {
    const t = strictTranslator('es', 'blog');
    const found = renderList('es');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'zzzz' } });
    expect(screen.getByText(t('list.noResultsTitle'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t('list.showAll') }));
    expect(screen.queryByText(t('list.noResultsTitle'))).toBeNull();
    found.unmount();

    renderList('es', []);
    expect(screen.getByText(t('list.emptyTitle'))).toBeInTheDocument();
    expect(screen.getByText(t('list.emptyBody'))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t('list.showAll') })).toBeNull();
    expect(screen.queryByText(t('list.noResultsTitle'))).toBeNull();
  });
});

describe('home page blog section', () => {
  const feed = {
    posts: [
      {
        slug: 'guide-excellence', title: 'Guide Excellence Program', excerpt: 'Strengthening professional standards.',
        category: 'news-updates', readTime: 5,
        translations: { ar: { title: 'برنامج التميّز للمرشدين', excerpt: 'تعزيز المعايير المهنية.' } },
      },
      { slug: 'nile-cruise', title: 'Nile Cruise for Couples', excerpt: 'Route advice.', category: 'destination-guides', translations: {} },
    ],
  };

  it.each(['en', ...OTHER_LOCALES])('reads in %s and overlays a translated post', async (locale) => {
    mockLocale = locale;
    fetchMock.mockResolvedValue(answer(200, feed));
    const t = strictTranslator(locale, 'blog');
    const { container } = render(<HomeBlogSection />);
    const section = await waitFor(() => {
      const node = container.querySelector('section');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    const text = visibleText(section);
    for (const key of ['home.eyebrow', 'home.title', 'home.subtitle', 'home.viewAll', 'home.readMore', 'categories.news-updates']) {
      expect(text).toContain(t(key));
    }
    expect(text).toContain(t('readTime', { count: 5, n: '5' }));
    expect(text).not.toMatch(/News Updates|news-updates/);
    expect(within(section).getByText(locale === 'ar' ? 'برنامج التميّز للمرشدين' : 'Guide Excellence Program')).toBeInTheDocument();
    expect(within(section).getByText('Nile Cruise for Couples')).toBeInTheDocument();
  });

  it('keeps its English wording', async () => {
    fetchMock.mockResolvedValue(answer(200, feed));
    const { container } = render(<HomeBlogSection />);
    await waitFor(() => expect(container.querySelector('section')).not.toBeNull());
    const text = visibleText(container);
    for (const label of ['From our blog', 'Travel tips & Egypt guides', 'Stories, guides, and inspiration to plan your perfect trip.', 'Read more', 'View all articles', '5 min read', 'News & Updates']) {
      expect(text).toContain(label);
    }
  });
});
