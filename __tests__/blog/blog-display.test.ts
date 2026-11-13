/**
 * @jest-environment node
 */
import { blogReadMinutes, formatBlogDate, tourDisplayPrice } from '@/lib/blog/blogDisplay';
import { localizeBlogSummary, toBlogCard } from '@/lib/blog/blogCards';

const PUBLISHED = '2026-11-12T08:00:00.000Z';
const ARABIC_INDIC_DIGITS = /[٠-٩۰-۹]/;

describe('blog dates', () => {
  it('prints the Arabic month name with Western digits, like the rest of the Arabic site', () => {
    const text = formatBlogDate(PUBLISHED, 'ar');
    expect(text).toBe('12 نوفمبر 2026');
    expect(text).not.toMatch(ARABIC_INDIC_DIGITS);
  });

  it('keeps the compact Arabic card date in Western digits too', () => {
    const text = formatBlogDate(PUBLISHED, 'ar', 'numeric');
    expect(text).not.toMatch(ARABIC_INDIC_DIGITS);
    expect(text.replace(/[^\d/]/g, '')).toBe('12/11/2026');
  });

  it('keeps the English dates exactly as they were', () => {
    expect(formatBlogDate(PUBLISHED, 'en')).toBe('Nov 12, 2026');
    expect(formatBlogDate(PUBLISHED, 'en', 'numeric')).toBe('11/12/2026');
    expect(formatBlogDate('2026-04-14T00:00:00.000Z', 'en', 'numeric')).toBe('4/14/2026');
  });

  it('writes each language in its own order', () => {
    expect(formatBlogDate(PUBLISHED, 'de')).toBe('12. Nov. 2026');
    expect(formatBlogDate(PUBLISHED, 'de', 'numeric')).toBe('12.11.2026');
    expect(formatBlogDate(PUBLISHED, 'fr')).toMatch(/^12 nov\.? 2026$/);
    expect(formatBlogDate(PUBLISHED, 'es')).toMatch(/^12 nov\.? 2026$/);
    expect(formatBlogDate(PUBLISHED, 'fr', 'numeric')).toBe('12/11/2026');
  });

  it('reads the day in UTC so the server and the browser agree', () => {
    expect(formatBlogDate('2026-11-12T23:30:00.000Z', 'en')).toBe('Nov 12, 2026');
    expect(formatBlogDate('2026-11-12T00:10:00.000Z', 'en')).toBe('Nov 12, 2026');
    expect(formatBlogDate(new Date(PUBLISHED), 'en')).toBe('Nov 12, 2026');
  });

  it('prints nothing for a missing or broken date, and English for an unknown language', () => {
    expect(formatBlogDate(undefined, 'ar')).toBe('');
    expect(formatBlogDate(null, 'ar')).toBe('');
    expect(formatBlogDate('not a date', 'ar')).toBe('');
    expect(formatBlogDate(PUBLISHED, 'xx')).toBe('Nov 12, 2026');
  });
});

describe('figures that are shown only when they are real', () => {
  it('has no read time to show when the post stores none', () => {
    expect(blogReadMinutes(7)).toBe(7);
    for (const missing of [undefined, null, 0, -3, Number.NaN, '5', {}]) {
      expect(blogReadMinutes(missing)).toBeNull();
    }
  });

  it('shows the discounted price, else the price, else no price at all', () => {
    expect(tourDisplayPrice({ discountPrice: 35, price: 50 })).toBe(35);
    expect(tourDisplayPrice({ discountPrice: 0, price: 50 })).toBe(50);
    expect(tourDisplayPrice({ price: 50 })).toBe(50);
    for (const tour of [{}, { discountPrice: 0, price: 0 }, { price: '49' }, null, undefined]) {
      expect(tourDisplayPrice(tour as never)).toBeNull();
    }
  });
});

describe('blog cards in the language of the visitor', () => {
  const post = {
    _id: 'abc123',
    slug: 'guide-excellence',
    title: 'Guide Excellence Program',
    excerpt: 'Strengthening professional standards.',
    content: '<p>The whole English article.</p>',
    featuredImage: 'https://res.cloudinary.com/eeo/image/upload/philae.jpg',
    category: 'news-updates',
    featured: true,
    author: 'Team EEO',
    readTime: 5,
    views: 12,
    likes: 3,
    publishedAt: PUBLISHED,
    tags: ['Egypt tour guides', 'EEO'],
    translations: {
      ar: { title: 'برنامج التميّز للمرشدين', excerpt: 'تعزيز المعايير المهنية.', content: '<p>المقال كاملًا.</p>' },
      fr: { title: "Programme d'excellence des guides", excerpt: '   ' },
    },
  };

  it('shows the translated title and summary when the post has them', () => {
    const card = toBlogCard(post, 'ar');
    expect(card.title).toBe('برنامج التميّز للمرشدين');
    expect(card.excerpt).toBe('تعزيز المعايير المهنية.');
    expect(card.publishedDateText).not.toMatch(ARABIC_INDIC_DIGITS);
  });

  it('keeps English for each field the translation leaves blank', () => {
    const card = toBlogCard(post, 'fr');
    expect(card.title).toBe("Programme d'excellence des guides");
    expect(card.excerpt).toBe('Strengthening professional standards.');
  });

  it('shows English when the post has no translation for the language, or none at all', () => {
    expect(toBlogCard(post, 'de').title).toBe('Guide Excellence Program');
    expect(toBlogCard(post, 'en').title).toBe('Guide Excellence Program');
    const { translations: _unused, ...untranslated } = post;
    expect(toBlogCard(untranslated, 'ar').title).toBe('Guide Excellence Program');
    expect(toBlogCard({ ...post, translations: null }, 'ar').title).toBe('Guide Excellence Program');
  });

  it('reads translations stored as a Map', () => {
    const translations = new Map(Object.entries(post.translations));
    expect(toBlogCard({ ...post, translations }, 'ar').title).toBe('برنامج التميّز للمرشدين');
  });

  it('sends the browser a card, not the article body or its translations', () => {
    const card = toBlogCard(post, 'ar') as unknown as Record<string, unknown>;
    expect(Object.keys(card).sort()).toEqual([
      '_id', 'author', 'category', 'excerpt', 'featured', 'featuredImage', 'imageMetadata', 'likes',
      'publishedDateText', 'readTime', 'slug', 'tags', 'title', 'views',
    ]);
    expect(JSON.stringify(card)).not.toContain('المقال كاملًا');
    expect(JSON.stringify(card)).not.toContain('The whole English article');
  });

  it('carries real figures only', () => {
    const card = toBlogCard({ ...post, readTime: undefined, views: undefined, likes: -1, publishedAt: undefined }, 'en');
    expect(card.readTime).toBeNull();
    expect(card.views).toBe(0);
    expect(card.likes).toBe(0);
    expect(card.publishedDateText).toBe('');
    expect(toBlogCard(post, 'en').publishedDateText).toBe('11/12/2026');
  });

  it('localizes a related post or a linked tour and drops its translations', () => {
    const related = localizeBlogSummary(post, 'ar') as Record<string, unknown>;
    expect(related.title).toBe('برنامج التميّز للمرشدين');
    expect('translations' in related).toBe(false);
    const tour = { title: 'Giza Pyramids Tour', duration: '8 hours', translations: { de: { title: 'Pyramiden von Gizeh', duration: '8 Stunden' } } };
    expect(localizeBlogSummary(tour, 'de', ['title', 'duration'])).toEqual({ title: 'Pyramiden von Gizeh', duration: '8 Stunden' });
    expect(localizeBlogSummary(tour, 'fr', ['title', 'duration'])).toEqual({ title: 'Giza Pyramids Tour', duration: '8 hours' });
  });
});
