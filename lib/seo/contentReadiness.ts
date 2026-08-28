import { locales, defaultLocale } from '@/i18n/config';

export type ContentReadinessKind = 'tour' | 'destination' | 'category' | 'blog' | 'attraction-page';
export type ReadinessStatus = 'pass' | 'fail' | 'not-evaluated';
export type ReadinessCheckName =
  | 'identity'
  | 'substantiveCopy'
  | 'imagery'
  | 'translations'
  | 'commerceReadiness'
  | 'internalLinks';

export interface ContentReadinessInput {
  id: string;
  kind: ContentReadinessKind;
  slug?: unknown;
  title?: unknown;
  name?: unknown;
  description?: unknown;
  longDescription?: unknown;
  excerpt?: unknown;
  content?: unknown;
  image?: unknown;
  heroImage?: unknown;
  featuredImage?: unknown;
  images?: unknown;
  translations?: unknown;
  indexableLocales?: unknown;
  pricingSummary?: unknown;
  bookingOptions?: unknown;
  cancellationPolicy?: unknown;
  effectiveCancellationPolicy?: unknown;
  internalLinkCount?: unknown;
}

export interface ReadinessCheck {
  status: ReadinessStatus;
  detail: string;
}

export interface ContentReadinessRecord {
  id: string;
  kind: ContentReadinessKind;
  slug: string;
  title: string;
  overall: ReadinessStatus;
  checks: Record<ReadinessCheckName, ReadinessCheck>;
}

export interface ReadinessDenominator {
  pass: number;
  fail: number;
  notEvaluated: number;
  evaluated: number;
  total: number;
}

export interface ContentReadinessReport {
  generatedAt: string;
  scope: string;
  policy: string;
  summary: {
    overall: ReadinessDenominator;
    checks: Record<ReadinessCheckName, ReadinessDenominator>;
  };
  records: ContentReadinessRecord[];
}

const CHECK_NAMES: ReadinessCheckName[] = [
  'identity',
  'substantiveCopy',
  'imagery',
  'translations',
  'commerceReadiness',
  'internalLinks',
];

const TRANSLATION_FIELDS: Record<ContentReadinessKind, readonly string[]> = {
  tour: ['title', 'description'],
  destination: ['name', 'description'],
  category: ['name', 'description'],
  blog: ['title', 'excerpt', 'content'],
  'attraction-page': ['title', 'description'],
};

export function requireContentReadinessDatabaseUri(
  env: Readonly<Record<string, string | undefined>>,
): string {
  const uri = env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error('MONGODB_URI is required; no content-readiness report was generated.');
  }
  return uri;
}

function objectRecord(value: unknown): Record<string, unknown> | undefined {
  if (value instanceof Map) return Object.fromEntries(value.entries());
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function plainText(value: unknown): string {
  return typeof value === 'string'
    ? value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/\s+/g, ' ').trim()
    : '';
}

function usableString(value: unknown): boolean {
  return plainText(value).length > 0;
}

function checkIdentity(input: ContentReadinessInput): ReadinessCheck {
  const title = plainText(input.title || input.name);
  const slug = plainText(input.slug);
  const missing = [!title && 'title/name', !slug && 'slug'].filter(Boolean);
  return missing.length === 0
    ? { status: 'pass', detail: 'Stored title/name and slug are present.' }
    : { status: 'fail', detail: `Missing ${missing.join(' and ')}.` };
}

function checkSubstantiveCopy(input: ContentReadinessInput): ReadinessCheck {
  const copy = [input.description, input.longDescription, input.excerpt, input.content]
    .map(plainText)
    .filter(Boolean)
    .join(' ');
  const threshold = input.kind === 'blog' ? 300 : 200;
  return copy.length >= threshold
    ? { status: 'pass', detail: `${copy.length} plain-text characters (minimum ${threshold}).` }
    : { status: 'fail', detail: `${copy.length} plain-text characters (minimum ${threshold}).` };
}

function checkImagery(input: ContentReadinessInput): ReadinessCheck {
  const images = Array.isArray(input.images) ? input.images : [];
  const present = [input.image, input.heroImage, input.featuredImage, ...images].some(usableString);
  return present
    ? { status: 'pass', detail: 'At least one stored image URL is present.' }
    : { status: 'fail', detail: 'No stored image URL is present.' };
}

function checkTranslations(input: ContentReadinessInput): ReadinessCheck {
  const translations = objectRecord(input.translations);
  const requiredFields = TRANSLATION_FIELDS[input.kind];
  const suppliedIndexableLocales = Array.isArray(input.indexableLocales)
    ? input.indexableLocales.filter((locale): locale is string => typeof locale === 'string')
    : undefined;
  const requiredLocales = suppliedIndexableLocales
    ? locales.filter((locale) => locale !== defaultLocale && suppliedIndexableLocales.includes(locale))
    : locales.filter((locale) => locale !== defaultLocale);
  const missingLocales = requiredLocales.filter((locale) => {
    const bucket = objectRecord(translations?.[locale]);
    return !bucket || requiredFields.some((field) => !usableString(bucket[field]));
  });

  if (missingLocales.length === 0 && requiredLocales.length === 0) {
    return {
      status: 'pass',
      detail: 'Only the English source is indexable; incomplete locale fallbacks are excluded from indexing.',
    };
  }

  return missingLocales.length === 0
    ? { status: 'pass', detail: `Explicit ${requiredFields.join(' + ')} content exists for indexable locales ${requiredLocales.join(', ')}.` }
    : { status: 'fail', detail: `Missing complete explicit locale content for: ${missingLocales.join(', ')}.` };
}

function checkCommerce(input: ContentReadinessInput): ReadinessCheck {
  if (input.kind !== 'tour') {
    return { status: 'not-evaluated', detail: 'Commerce readiness applies only to tours.' };
  }

  const pricing = objectRecord(input.pricingSummary);
  const priceReady = typeof pricing?.fromPrice === 'number'
    && Number.isFinite(pricing.fromPrice)
    && pricing.fromPrice > 0
    && usableString(pricing.currency)
    && typeof pricing.version === 'number'
    && Number.isInteger(pricing.version)
    && pricing.version >= 0;
  const options = Array.isArray(input.bookingOptions) ? input.bookingOptions : [];
  const optionsReady = options.length > 0 && options.every((option) => {
    const record = objectRecord(option);
    return Boolean(
      record
      && usableString(record.label || record.type)
      && typeof record.price === 'number'
      && Number.isFinite(record.price)
      && record.price >= 0,
    );
  });
  const policyReady = plainText(input.cancellationPolicy || input.effectiveCancellationPolicy).length >= 30;
  const missing = [
    !priceReady && 'versioned pricing summary',
    !optionsReady && 'well-formed booking options',
    !policyReady && 'substantive cancellation policy',
  ].filter(Boolean);

  return missing.length === 0
    ? {
        status: 'pass',
        detail: 'Pricing, options, and policy are structurally present; commercial authority still requires owner review.',
      }
    : { status: 'fail', detail: `Missing ${missing.join(', ')}.` };
}

function checkInternalLinks(input: ContentReadinessInput): ReadinessCheck {
  if (typeof input.internalLinkCount !== 'number' || !Number.isFinite(input.internalLinkCount)) {
    return { status: 'not-evaluated', detail: 'Relationship/link count was not supplied.' };
  }
  return input.internalLinkCount > 0
    ? { status: 'pass', detail: `${input.internalLinkCount} stored or content-derived internal link(s).` }
    : { status: 'fail', detail: 'No stored or content-derived internal links found.' };
}

export function evaluateContentReadiness(input: ContentReadinessInput): ContentReadinessRecord {
  const checks: ContentReadinessRecord['checks'] = {
    identity: checkIdentity(input),
    substantiveCopy: checkSubstantiveCopy(input),
    imagery: checkImagery(input),
    translations: checkTranslations(input),
    commerceReadiness: checkCommerce(input),
    internalLinks: checkInternalLinks(input),
  };
  const statuses = CHECK_NAMES.map((name) => checks[name].status);
  const overall: ReadinessStatus = statuses.includes('fail')
    ? 'fail'
    : statuses.includes('pass')
      ? 'pass'
      : 'not-evaluated';

  return {
    id: input.id,
    kind: input.kind,
    slug: plainText(input.slug),
    title: plainText(input.title || input.name),
    overall,
    checks,
  };
}

function denominator(statuses: readonly ReadinessStatus[]): ReadinessDenominator {
  const pass = statuses.filter((status) => status === 'pass').length;
  const fail = statuses.filter((status) => status === 'fail').length;
  const notEvaluated = statuses.filter((status) => status === 'not-evaluated').length;
  return { pass, fail, notEvaluated, evaluated: pass + fail, total: statuses.length };
}

export function buildContentReadinessReport(
  inputs: readonly ContentReadinessInput[],
  generatedAt = new Date().toISOString(),
): ContentReadinessReport {
  const records = inputs
    .map(evaluateContentReadiness)
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.slug.localeCompare(b.slug) || a.id.localeCompare(b.id));
  const checks = Object.fromEntries(
    CHECK_NAMES.map((name) => [name, denominator(records.map((record) => record.checks[name].status))]),
  ) as Record<ReadinessCheckName, ReadinessDenominator>;

  return {
    generatedAt,
    scope: 'Published, non-archived, default-tenant public content queried read-only.',
    policy: 'The audit reports stored readiness only. It never publishes, edits, repairs, or treats pricing/translations as owner-approved.',
    summary: {
      overall: denominator(records.map((record) => record.overall)),
      checks,
    },
    records,
  };
}

export function renderContentReadinessJson(report: ContentReadinessReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

function markdownCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

export function renderContentReadinessMarkdown(report: ContentReadinessReport): string {
  const lines = [
    '# EEO Content Readiness Audit',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    `Scope: ${report.scope}`,
    '',
    `Policy: ${report.policy}`,
    '',
    '## Summary',
    '',
    '| Check | Pass | Fail | Not evaluated | Evaluated / Total |',
    '| --- | ---: | ---: | ---: | ---: |',
  ];

  const summaryRows: Array<[string, ReadinessDenominator]> = [
    ['Overall', report.summary.overall],
    ...CHECK_NAMES.map((name) => [name, report.summary.checks[name]] as [string, ReadinessDenominator]),
  ];
  for (const [name, counts] of summaryRows) {
    lines.push(`| ${name} | ${counts.pass} | ${counts.fail} | ${counts.notEvaluated} | ${counts.evaluated} / ${counts.total} |`);
  }

  lines.push(
    '',
    '## Records',
    '',
    '| Kind | Slug | Title | Overall | Identity | Copy | Imagery | Translations | Commerce | Internal links | Findings |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  );
  for (const record of report.records) {
    const findings = CHECK_NAMES
      .filter((name) => record.checks[name].status !== 'pass')
      .map((name) => `${name}: ${record.checks[name].detail}`)
      .join(' ');
    lines.push([
      record.kind,
      record.slug || '(missing)',
      markdownCell(record.title || '(missing)'),
      record.overall,
      record.checks.identity.status,
      record.checks.substantiveCopy.status,
      record.checks.imagery.status,
      record.checks.translations.status,
      record.checks.commerceReadiness.status,
      record.checks.internalLinks.status,
      markdownCell(findings || 'None'),
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }

  return `${lines.join('\n')}\n`;
}
