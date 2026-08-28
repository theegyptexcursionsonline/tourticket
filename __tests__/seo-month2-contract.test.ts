import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render } from '@testing-library/react';
import ContextualDiscoveryLinks from '@/components/seo/ContextualDiscoveryLinks';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('Month-2 SEO growth contracts', () => {
  it('renders contextual discovery on priority detail and editorial templates', () => {
    for (const file of [
      'app/[locale]/[slug]/TourDetailContent.tsx',
      'app/[locale]/destinations/[slug]/DestinationPageClient.tsx',
      'app/[locale]/categories/[slug]/CategoryPageClient.tsx',
      'app/[locale]/blog/[slug]/page.tsx',
    ]) {
      expect(read(file)).toContain('<ContextualDiscoveryLinks');
    }
  });

  it('renders a localized, crawlable navigation only when real links exist', () => {
    const { getByRole, queryByText } = render(React.createElement(ContextualDiscoveryLinks, {
      locale: 'de',
      links: [
        { href: '/de/destinations/cairo', label: 'Kairo' },
        { href: 'https://example.com', label: 'External' },
      ],
    }));
    expect(getByRole('navigation', { name: 'Ähnliche Themen entdecken' })).toBeTruthy();
    expect(getByRole('link', { name: 'Kairo' }).getAttribute('href')).toBe('/de/destinations/cairo');
    expect(queryByText('External')).toBeNull();

    const empty = render(React.createElement(ContextualDiscoveryLinks, { locale: 'en', links: [] }));
    expect(empty.container).toBeEmptyDOMElement();
  });

  it('uses real stored relationships and never backfills unrelated editorial tours', () => {
    const blog = read('app/[locale]/blog/[slug]/page.tsx');
    expect(blog).toContain('relatedDestinations');
    expect(blog).toContain('relatedTours');
    expect(blog).toContain('tags: { $in: blogTags }');
    expect(blog).not.toContain('relevantTours.length < 3');
    expect(blog).not.toContain('featured: -1, createdAt: -1');
  });

  it('matches contextual taxonomies to public default-tenant records', () => {
    for (const file of [
      'app/[locale]/[slug]/TourDetailContent.tsx',
      'app/[locale]/destinations/[slug]/DestinationDetailContent.tsx',
      'app/[locale]/categories/[slug]/CategoryDetailContent.tsx',
    ]) {
      const source = read(file);
      expect(source).toContain("match: { ...DEFAULT_TENANT_FILTER, ...PUBLIC_CONTENT_FILTER }");
    }
  });

  it('keeps linked-page cards public-only and on canonical content paths', () => {
    const source = read('lib/attractionPages/pageContent.ts');
    expect(source.match(/\.\.\.PUBLIC_CONTENT_FILTER/g)).toHaveLength(2);
    expect(source).toContain('attractionPagePath(');
    expect(source).not.toContain('`/category/${String(doc.slug)}`');
  });

  it('keeps the readiness command read-only and exposes both report formats', () => {
    const script = read('scripts/audit-seo-content-readiness.ts');
    expect(script).toContain('requireContentReadinessDatabaseUri(process.env)');
    expect(script).toContain('renderContentReadinessJson(report)');
    expect(script).toContain('renderContentReadinessMarkdown(report)');
    expect(script).toContain('new MongoClient(databaseUri');
    expect(script).toContain("readPreference: 'secondaryPreferred'");
    expect(script).toContain("database.collection('tours').find(");
    expect(script).not.toContain("import('@/lib/dbConnect')");
    expect(script).not.toContain("import('@/lib/models/");
    expect(script).not.toMatch(/\.save\(|\.create\(|\.update(?:One|Many)?\(|findByIdAndUpdate|findOneAndUpdate|delete(?:One|Many)?/);

    const packageJson = JSON.parse(read('package.json'));
    expect(packageJson.scripts['seo:audit-content-readiness']).toContain('--format=markdown');
    expect(packageJson.scripts['seo:audit-content-readiness:json']).toContain('--format=json');
  });

  it('does not assert EEO operates every tour in list schema', () => {
    const schema = read('components/schema/ToursListSchema.tsx');
    expect(schema).toContain("'@type': 'TouristTrip'");
    expect(schema).not.toContain('provider:');
  });

  it('does not force index directives from the shared layout onto 404 pages', () => {
    const layout = read('app/[locale]/layout.tsx');
    expect(layout).not.toMatch(/\brobots\s*:/);
    expect(layout).not.toMatch(/\bgoogleBot\s*:/);
  });

  it('keeps one semantic H1 on each priority static page', () => {
    const pages = [
      ['app/[locale]/about/page.tsx', 'About Egypt Excursions Online'],
      ['app/[locale]/careers/CareersClientPage.tsx', 'Join Our Team'],
      ['app/[locale]/faqs/FAQsClientPage.tsx', 'Frequently Asked Questions'],
      ['app/[locale]/privacy/PrivacyClientPage.tsx', 'Privacy Policy'],
      ['app/[locale]/terms/TermsClientPage.tsx', 'Terms of Service'],
    ] as const;

    for (const [file, pageHeading] of pages) {
      const source = read(file);
      expect(source.match(/<h1\b/g) || []).toHaveLength(1);
      expect(source).toMatch(new RegExp(`<h1\\b[^>]*>\\s*${pageHeading}\\s*</h1>`));
    }
  });
});
