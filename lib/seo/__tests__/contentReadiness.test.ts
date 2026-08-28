import {
  buildContentReadinessReport,
  evaluateContentReadiness,
  renderContentReadinessJson,
  renderContentReadinessMarkdown,
  requireContentReadinessDatabaseUri,
  type ContentReadinessInput,
} from '@/lib/seo/contentReadiness';

const translations = Object.fromEntries(
  ['ar', 'es', 'fr', 'de'].map((locale) => [locale, {
    title: `${locale} title`,
    description: `${locale} description`,
  }]),
);

function completeTour(): ContentReadinessInput {
  return {
    id: 'tour-1',
    kind: 'tour',
    slug: 'cairo-tour',
    title: 'Cairo tour',
    description: 'A'.repeat(120),
    longDescription: '<p>' + 'B'.repeat(120) + '</p>',
    image: '/images/cairo.jpg',
    translations,
    pricingSummary: { fromPrice: 45, currency: 'USD', version: 2 },
    bookingOptions: [{ label: 'Adult', price: 45 }],
    cancellationPolicy: 'Cancellation terms are stored for owner review.',
    internalLinkCount: 3,
  };
}

describe('content readiness audit contract', () => {
  it('passes a structurally complete tour without mutating its source record', () => {
    const input = completeTour();
    const before = JSON.parse(JSON.stringify(input));
    const result = evaluateContentReadiness(input);

    expect(result.overall).toBe('pass');
    expect(Object.values(result.checks).map((check) => check.status)).toEqual([
      'pass', 'pass', 'pass', 'pass', 'pass', 'pass',
    ]);
    expect(result.checks.commerceReadiness.detail).toContain('owner review');
    expect(input).toEqual(before);
  });

  it('accepts the catalogue pricing baseline and the effective storefront policy', () => {
    const result = evaluateContentReadiness({
      ...completeTour(),
      pricingSummary: { fromPrice: 45, currency: 'USD', version: 0 },
      cancellationPolicy: undefined,
      effectiveCancellationPolicy: 'Self-service cancellation terms apply and are shown before checkout.',
    });

    expect(result.checks.commerceReadiness.status).toBe('pass');
  });

  it('passes source-only content when untranslated fallback locales are not indexable', () => {
    const result = evaluateContentReadiness({
      id: 'blog-1',
      kind: 'blog',
      slug: 'cairo-guide',
      title: 'Cairo guide',
      excerpt: 'A'.repeat(160),
      content: 'B'.repeat(200),
      featuredImage: '/blog.jpg',
      translations: {},
      indexableLocales: ['en'],
      internalLinkCount: 1,
    });

    expect(result.checks.translations).toEqual({
      status: 'pass',
      detail: 'Only the English source is indexable; incomplete locale fallbacks are excluded from indexing.',
    });
  });

  it('fails incomplete public content and distinguishes checks that cannot be evaluated', () => {
    const result = evaluateContentReadiness({
      id: 'destination-1',
      kind: 'destination',
      slug: '',
      name: 'Cairo',
      description: 'Too short',
    });

    expect(result.overall).toBe('fail');
    expect(result.checks.identity.status).toBe('fail');
    expect(result.checks.substantiveCopy.status).toBe('fail');
    expect(result.checks.imagery.status).toBe('fail');
    expect(result.checks.translations.detail).toContain('ar, es, fr, de');
    expect(result.checks.commerceReadiness.status).toBe('not-evaluated');
    expect(result.checks.internalLinks.status).toBe('not-evaluated');
  });

  it('reports explicit pass/fail/not-evaluated denominators in JSON and Markdown', () => {
    const report = buildContentReadinessReport([
      completeTour(),
      {
        id: 'blog-1',
        kind: 'blog',
        slug: 'short-post',
        title: 'Short post',
        excerpt: 'Short',
        content: 'Short',
        featuredImage: '/blog.jpg',
        translations: {},
        internalLinkCount: 0,
      },
    ], '2026-08-28T00:00:00.000Z');

    expect(report.summary.overall).toEqual({ pass: 1, fail: 1, notEvaluated: 0, evaluated: 2, total: 2 });
    expect(report.summary.checks.commerceReadiness).toEqual({
      pass: 1,
      fail: 0,
      notEvaluated: 1,
      evaluated: 1,
      total: 2,
    });
    expect(JSON.parse(renderContentReadinessJson(report))).toMatchObject({
      generatedAt: '2026-08-28T00:00:00.000Z',
      summary: { overall: { pass: 1, fail: 1, total: 2 } },
    });
    const markdown = renderContentReadinessMarkdown(report);
    expect(markdown).toContain('| Overall | 1 | 1 | 0 | 2 / 2 |');
    expect(markdown).toContain('| commerceReadiness | 1 | 0 | 1 | 1 / 2 |');
    expect(markdown).toContain('The audit reports stored readiness only.');
  });

  it('fails closed before querying when database configuration is missing', () => {
    expect(() => requireContentReadinessDatabaseUri({})).toThrow(
      'MONGODB_URI is required; no content-readiness report was generated.',
    );
    expect(requireContentReadinessDatabaseUri({ MONGODB_URI: ' mongodb://example ' }))
      .toBe('mongodb://example');
  });
});
