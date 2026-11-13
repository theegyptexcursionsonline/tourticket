/**
 * @jest-environment node
 */
// 12 Nov 2026: the first translated article went live and its frame was still
// English in Arabic, Spanish, French and German: about thirty-five labels were
// written straight into the blog components. The blog now reads from the `blog`
// messages in every language; these checks keep it that way.
import fs from 'node:fs';
import path from 'node:path';
import { findHardCodedCopy, findTranslationKeys } from '@/test-support/hardCodedCopy';
import { SITE_LOCALES, flattenMessages, messagesFor, strictTranslator } from '@/test-support/blogIntl';
import { BLOG_CATEGORIES, blogCategoryLabel } from '@/lib/blog/blogDisplay';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

const BLOG_SOURCES = [
  'app/[locale]/blog/page.tsx',
  'app/[locale]/blog/BlogClientPage.tsx',
  'app/[locale]/blog/[slug]/page.tsx',
  'app/[locale]/blog/[slug]/BlogPostClient.tsx',
  'app/[locale]/blog/[slug]/BlogNewsletterForm.tsx',
  'app/[locale]/blog/[slug]/AuthorCard.tsx',
  'components/HomeBlogSection.tsx',
];

const blogMessages = (locale: string) =>
  flattenMessages((messagesFor(locale) as Record<string, unknown>).blog, 'blog');

describe('the detector catches wording written into a component', () => {
  // Each of these shipped in the blog before 12 Nov 2026.
  it.each([
    ['<span>Share</span>', 'Share'],
    ['<Link href="/blog"><Icon /> Back to articles</Link>', 'Back to articles'],
    ['<input placeholder="Your email" />', 'Your email'],
    ['<div aria-label="Partnership highlights" />', 'Partnership highlights'],
    ['<button aria-label={liked ? `Liked. ${likes} likes` : `Like this post. ${likes} likes`} />', 'Liked.'],
    ["<div>{tour.duration || 'Half day'}</div>", 'Half day'],
    ["<span>{price ? `$${price}` : 'Book'}</span>", 'Book'],
    ['<span>{blog.views ?? 0} views</span>', 'views'],
    ["<form onSubmit={() => toast.success('Subscribed')} />", 'Subscribed'],
    ["<p>{x}</p>; throw new Error(result.error || 'Unable to save this like right now.')", 'Unable to save'],
  ])('%s', (jsx, expected) => {
    const found = findHardCodedCopy('sample.tsx', `const a = ${jsx.includes(';') ? `() => { ${jsx} }` : jsx};`);
    expect(found.map((entry) => entry.text).join(' | ')).toContain(expected);
  });

  it('catches wording returned from a helper, such as a stand-in read time', () => {
    const found = findHardCodedCopy(
      'sample.tsx',
      "function readTime(blog) { if (blog.readTime) return `${blog.readTime} min read`; return '5 min read'; }",
    );
    expect(found).toHaveLength(2);
  });

  it('leaves message keys, class names, figures and styles alone', () => {
    const found = findHardCodedCopy(
      'sample.tsx',
      `'use client';
       import x from 'some module';
       const a = (
         <div className="bg-white text-slate-900 rounded-2xl" data-testid="blog-newsletter-form">
           <strong>2011</strong><strong>108%</strong><bdi dir="ltr">+20 11 42255624</bdi>
           <span>{t('article.back')}</span><span aria-label={t('list.searchPlaceholder')}>#{tag}</span>
           <style jsx global>{\`.blog-content { font-family: Georgia, "Times New Roman", serif; }\`}</style>
         </div>
       );
       console.warn('Unable to load blog like status.');
       query.select('title slug excerpt featuredImage');`,
    );
    expect(found).toEqual([]);
  });
});

describe('blog pages carry no wording of their own', () => {
  it.each(BLOG_SOURCES)('%s takes every visible word from the messages', (file) => {
    const found = findHardCodedCopy(file, read(file));
    expect(found.map((entry) => `${file}:${entry.line} ${entry.reason}: ${entry.text}`)).toEqual([]);
  });

  it.each(BLOG_SOURCES)('%s asks only for messages that exist', (file) => {
    const english = { ...blogMessages('en') };
    const missing = findTranslationKeys(file, read(file))
      .filter((use) => use.key.startsWith('blog'))
      .filter((use) => !(use.key in english))
      .map((use) => `${file}:${use.line} ${use.key}`);
    expect(missing).toEqual([]);
  });

  it('uses the blog messages in every one of these files', () => {
    for (const file of BLOG_SOURCES) {
      expect(findTranslationKeys(file, read(file)).length).toBeGreaterThan(0);
    }
  });

  it('keeps blog links aware of the page language', () => {
    for (const file of BLOG_SOURCES.filter((name) => !name.endsWith('page.tsx'))) {
      const source = read(file);
      expect(source).toContain("import { Link } from '@/i18n/routing'");
      expect(source).not.toContain("from 'next/link'");
    }
  });
});

describe('blog messages exist in every language', () => {
  const english = blogMessages('en');
  const keys = Object.keys(english).sort();

  it('has a full set of blog messages in English', () => {
    expect(keys.length).toBeGreaterThan(90);
  });

  it.each(SITE_LOCALES)('%s has exactly the English keys, none of them empty', (locale) => {
    const messages = blogMessages(locale);
    expect(Object.keys(messages).sort()).toEqual(keys);
    expect(Object.entries(messages).filter(([, value]) => !value.trim())).toEqual([]);
  });

  // Names that are the same word in several languages; everything else must be translated.
  const SAME_AS_ENGLISH = new Set([
    'blog.article.shareFacebook', 'blog.article.shareTwitter', 'blog.author.facebook', 'blog.author.twitter',
    'blog.article.tags', 'blog.meta.fallbackTitle', 'blog.list.articleCount',
  ]);

  it.each(SITE_LOCALES.filter((locale) => locale !== 'en'))('%s is translated, not a copy of the English', (locale) => {
    const messages = blogMessages(locale);
    const copied = keys.filter((key) => messages[key] === english[key] && !SAME_AS_ENGLISH.has(key));
    expect(copied).toEqual([]);
  });

  it.each(SITE_LOCALES)('%s messages all format, with the same values and tags as English', (locale) => {
    const t = strictTranslator(locale);
    const names = (message: string) =>
      [...new Set([...message.matchAll(/\{(\w+)[,}]/g)].map((match) => match[1]))].sort();
    const tags = (message: string) => [...new Set([...message.matchAll(/<(\w+)>/g)].map((match) => match[1]))].sort();
    const messages = blogMessages(locale);
    for (const key of keys) {
      // A language without plural forms (German "{n} Artikel") may drop `count`; none may add a value.
      expect({ key, extra: names(messages[key]).filter((name) => !names(english[key]).includes(name) && name !== 'count') })
        .toEqual({ key, extra: [] });
      expect({ key, tags: tags(messages[key]) }).toEqual({ key, tags: tags(english[key]) });
      for (const count of [0, 1, 2, 3, 11, 67, 100]) {
        const text = t.markup(key, {
          count,
          n: String(count),
          category: 'X',
          link: (chunks: string) => `<a>${chunks}</a>`,
        });
        expect(text).not.toMatch(/[{}]/);
        // One digit system on the whole site: no Arabic-Indic or Persian digits.
        expect(text).not.toMatch(/[٠-٩۰-۹]/);
      }
    }
  });

  it('writes Arabic in Arabic script and keeps the phone number and figures in Western digits', () => {
    const arabic = blogMessages('ar');
    const latinOnly = Object.entries(arabic)
      .filter(([, value]) => !/[؀-ۿ]/.test(value))
      .map(([key]) => key);
    expect(latinOnly).toEqual([]);
    expect(arabic['blog.partnership.yearsValue']).toBe('15 عامًا');
  });

  it('counts in each language', () => {
    const count = (locale: string, n: number) =>
      strictTranslator(locale, 'blog')('list.articleCount', { count: n, n: String(n) });
    expect([1, 67].map((n) => count('en', n))).toEqual(['1 article', '67 articles']);
    expect([0, 1, 2, 5, 11, 67, 100].map((n) => count('ar', n))).toEqual([
      'لا توجد مقالات', 'مقال واحد', 'مقالان', '5 مقالات', '11 مقالًا', '67 مقالًا', '100 مقال',
    ]);
    expect([1, 2].map((n) => count('fr', n))).toEqual(['1 article', '2 articles']);
    expect([1, 2].map((n) => count('es', n))).toEqual(['1 artículo', '2 artículos']);
    expect([1, 2].map((n) => count('de', n))).toEqual(['1 Artikel', '2 Artikel']);
    const read = (locale: string, n: number) => strictTranslator(locale, 'blog')('readTime', { count: n, n: String(n) });
    expect(read('en', 5)).toBe('5 min read');
    expect([1, 2, 5, 12].map((n) => read('ar', n))).toEqual([
      'قراءة في دقيقة', 'قراءة في دقيقتين', 'قراءة في 5 دقائق', 'قراءة في 12 دقيقة',
    ]);
  });

  it('keeps the English wording the blog had, apart from the corrected hero line', () => {
    const t = strictTranslator('en', 'blog');
    expect(t('list.title')).toBe('Travel Stories & Insights');
    expect(t('article.back')).toBe('Back to articles');
    expect(t('article.toursHeading')).toBe("Tours you'll love");
    expect(t('article.relatedHeading')).toBe('Related Articles');
    expect(t('sidebar.bookTitle')).toBe('Book a Tour');
    expect(t('newsletter.body')).toBe('Subscribe for the best Egypt tours & insider tips.');
    expect(t('partnership.badge')).toBe('Success story');
  });

  it.each(SITE_LOCALES)('%s hero line speaks of Egypt, not of the whole world', (locale) => {
    const line = blogMessages(locale)['blog.list.subtitle'];
    expect(line).toMatch(/Egypt|Egipto|Égypte|Ägypten|مصر/);
    expect(line).not.toMatch(/around the world|del mundo|du monde|aller Welt|العالم/i);
  });
});

describe('blog categories have a name in every language', () => {
  it('covers exactly the categories the Blog model accepts', () => {
    const model = read('lib/models/Blog.ts');
    const start = model.indexOf('enum: [', model.indexOf('category: {'));
    const values = [...model.slice(start, model.indexOf(']', start)).matchAll(/'([a-z-]+)'/g)].map((match) => match[1]);
    expect(values.length).toBe(14);
    expect([...BLOG_CATEGORIES]).toEqual(values);
  });

  it.each(SITE_LOCALES)('%s names every category and never prints the stored value', (locale) => {
    const t = strictTranslator(locale, 'blog');
    for (const category of BLOG_CATEGORIES) {
      const label = blogCategoryLabel(t, category);
      expect(label.trim()).not.toBe('');
      expect(label).not.toBe(category);
      expect(label).not.toMatch(/^[a-z]+(-[a-z]+)+$/);
    }
  });

  it('gives the names a reader expects', () => {
    expect(blogCategoryLabel(strictTranslator('en', 'blog'), 'news-updates')).toBe('News & Updates');
    expect(blogCategoryLabel(strictTranslator('en', 'blog'), 'food-culture')).toBe('Food & Culture');
    expect(blogCategoryLabel(strictTranslator('ar', 'blog'), 'news-updates')).toBe('الأخبار والمستجدات');
    expect(blogCategoryLabel(strictTranslator('es', 'blog'), 'travel-tips')).toBe('Consejos de viaje');
    expect(blogCategoryLabel(strictTranslator('fr', 'blog'), 'destination-guides')).toBe('Guides de destinations');
    expect(blogCategoryLabel(strictTranslator('de', 'blog'), 'family-travel')).toBe('Familienreisen');
  });

  it('spells out a value outside the list instead of printing a code, and shows nothing for none', () => {
    const t = strictTranslator('en', 'blog');
    expect(blogCategoryLabel(t, 'red-sea-diving')).toBe('Red Sea Diving');
    expect(blogCategoryLabel(t, '')).toBe('');
    expect(blogCategoryLabel(t, undefined)).toBe('');
  });
});
