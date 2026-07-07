// lib/tools/visa.ts
// Client + local model for the Egypt Visa Checker tool. Nationality → entry
// guidance is computed locally (so the tool works instantly and even if the
// central tools API is down); the API is used to pull the rotated credit
// backlink for this host and, optionally, a refreshed nationality list.
// Mirrors foxes-tools-api/lib/visaChecker.js — keep the two in sync.

const TOOLS_API_URL = (process.env.TOOLS_API_URL || 'https://foxes-tools-api-production.up.railway.app').replace(/\/+$/, '');

// Where third-party sites load the embeddable widget iframe from.
export const VISA_EMBED_SRC = `${TOOLS_API_URL}/embed/visa-checker.html`;

export const OFFICIAL_URL = 'https://visa2egypt.gov.eg';
export const EVISA_COST = 25;
export const EVISA_VALIDITY_DAYS = 30;
export const EVISA_VALID_FROM_ISSUE_DAYS = 90;

export type VisaCategory = 'visa_free' | 'evisa_or_arrival' | 'evisa_only' | 'embassy';

export interface Nationality { slug: string; name: string }
export interface CreditLink { name: string; url: string }

export interface VisaResult {
  nationality: string;
  slug: string | null;
  known: boolean;
  category: VisaCategory;
  requirement: string;
  cost: number | null;
  stayDays: number | null;
  entries: string | null;
  action: string;
  steps: string[];
  official: string;
  validFromIssueDays: number;
  disclaimer: string;
}

export interface VisaConfig {
  nationalities: Nationality[];
  links: CreditLink[];
  official: string;
  evisaCost: number;
  stayDays: number;
  embedSrc: string;
}

const VISA_FREE: [string, string][] = [
  ['bahrain', 'Bahrain'], ['kuwait', 'Kuwait'], ['oman', 'Oman'],
  ['saudi-arabia', 'Saudi Arabia'], ['uae', 'United Arab Emirates'],
  ['hong-kong', 'Hong Kong'], ['macau', 'Macau'],
];

const EVISA_OR_ARRIVAL: [string, string][] = [
  ['united-states', 'United States'], ['canada', 'Canada'],
  ['united-kingdom', 'United Kingdom'], ['ireland', 'Ireland'],
  ['germany', 'Germany'], ['france', 'France'], ['italy', 'Italy'],
  ['spain', 'Spain'], ['netherlands', 'Netherlands'], ['belgium', 'Belgium'],
  ['austria', 'Austria'], ['switzerland', 'Switzerland'], ['portugal', 'Portugal'],
  ['greece', 'Greece'], ['poland', 'Poland'], ['sweden', 'Sweden'],
  ['norway', 'Norway'], ['denmark', 'Denmark'], ['finland', 'Finland'],
  ['czechia', 'Czech Republic'], ['hungary', 'Hungary'], ['romania', 'Romania'],
  ['croatia', 'Croatia'], ['australia', 'Australia'], ['new-zealand', 'New Zealand'],
  ['japan', 'Japan'], ['south-korea', 'South Korea'], ['russia', 'Russia'],
  ['ukraine', 'Ukraine'], ['serbia', 'Serbia'], ['georgia', 'Georgia'],
];

const EVISA_ONLY: [string, string][] = [
  ['china', 'China'], ['india', 'India'], ['south-africa', 'South Africa'],
  ['brazil', 'Brazil'], ['argentina', 'Argentina'], ['mexico', 'Mexico'],
  ['philippines', 'Philippines'], ['thailand', 'Thailand'], ['malaysia', 'Malaysia'],
];

type Template = Omit<VisaResult, 'nationality' | 'slug' | 'known' | 'validFromIssueDays' | 'disclaimer'>;

const TEMPLATES: Record<VisaCategory, () => Template> = {
  visa_free: () => ({
    category: 'visa_free',
    requirement: 'No visa required',
    cost: 0,
    stayDays: 90,
    entries: 'single/multiple per bilateral terms',
    action: 'Travel on a passport valid 6+ months. No visa needed for tourism.',
    steps: ['Passport valid at least 6 months beyond arrival', 'Proof of onward/return travel may be requested'],
    official: OFFICIAL_URL,
  }),
  evisa_or_arrival: () => ({
    category: 'evisa_or_arrival',
    requirement: 'e-Visa online or visa on arrival',
    cost: EVISA_COST,
    stayDays: EVISA_VALIDITY_DAYS,
    entries: 'single entry (multiple-entry e-visa also available)',
    action: `Apply online at ${OFFICIAL_URL} (recommended) or buy a visa on arrival at the airport for about $${EVISA_COST}.`,
    steps: [
      `Apply on ${OFFICIAL_URL} — approval usually within a week`,
      'Or pay ~$25 in cash at the arrival visa bank desk before immigration',
      'Passport valid 6+ months; keep a printed e-visa / entry stamp',
    ],
    official: OFFICIAL_URL,
  }),
  evisa_only: () => ({
    category: 'evisa_only',
    requirement: 'e-Visa online (apply in advance)',
    cost: EVISA_COST,
    stayDays: EVISA_VALIDITY_DAYS,
    entries: 'single entry (multiple-entry e-visa also available)',
    action: `Apply for the tourist e-visa online at ${OFFICIAL_URL} before you fly.`,
    steps: [
      `Apply on ${OFFICIAL_URL} at least 1–2 weeks before travel`,
      'Upload passport bio page and pay the e-visa fee online',
      'Carry a printed copy of the approved e-visa',
    ],
    official: OFFICIAL_URL,
  }),
  embassy: () => ({
    category: 'embassy',
    requirement: 'Check eligibility / apply via embassy',
    cost: null,
    stayDays: null,
    entries: null,
    action: `Confirm whether your nationality is e-visa eligible on ${OFFICIAL_URL}; otherwise apply at the nearest Egyptian embassy or consulate.`,
    steps: [
      `Check the current e-visa eligibility list on ${OFFICIAL_URL}`,
      'If not eligible online, apply at an Egyptian embassy/consulate',
      'Allow extra time for embassy processing',
    ],
    official: OFFICIAL_URL,
  }),
};

const INDEX: Record<string, { name: string; category: VisaCategory }> = {};
function register(list: [string, string][], category: VisaCategory) {
  for (const [slug, name] of list) INDEX[slug] = { name, category };
}
register(VISA_FREE, 'visa_free');
register(EVISA_OR_ARRIVAL, 'evisa_or_arrival');
register(EVISA_ONLY, 'evisa_only');

export const NATIONALITIES: Nationality[] = Object.entries(INDEX)
  .map(([slug, v]) => ({ slug, name: v.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function normSlug(input: string): string {
  return String(input || '').toLowerCase().trim().replace(/[^a-z]+/g, '-').replace(/^-+|-+$/g, '');
}

export function checkVisa(input: string): VisaResult {
  const slug = normSlug(input);
  const hit = INDEX[slug];
  const category: VisaCategory = hit ? hit.category : 'embassy';
  const name = hit ? hit.name : (input ? String(input).trim() : 'your country');
  return {
    nationality: name,
    slug: hit ? slug : null,
    known: !!hit,
    validFromIssueDays: EVISA_VALID_FROM_ISSUE_DAYS,
    disclaimer: 'Guidance only — visa rules change. Always confirm on the official portal before you book.',
    ...TEMPLATES[category](),
  };
}

const FALLBACK_LINK: CreditLink = { name: 'Egypt Excursions Online', url: 'https://egypt-excursionsonline.com' };

// Server-side: pull the rotated backlink (+ any refreshed nationality list) for
// this host. Falls back to the local list/link if the API is unreachable.
export async function getVisaConfig(host: string): Promise<VisaConfig> {
  const base: VisaConfig = {
    nationalities: NATIONALITIES,
    links: [FALLBACK_LINK],
    official: OFFICIAL_URL,
    evisaCost: EVISA_COST,
    stayDays: EVISA_VALIDITY_DAYS,
    embedSrc: VISA_EMBED_SRC,
  };
  try {
    const res = await fetch(
      `${TOOLS_API_URL}/v1/tools/visa-checker/config?host=${encodeURIComponent(host)}`,
      { next: { revalidate: 300 }, signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) return base;
    const data = (await res.json()) as Partial<VisaConfig>;
    return {
      ...base,
      nationalities: Array.isArray(data.nationalities) && data.nationalities.length ? data.nationalities : base.nationalities,
      links: Array.isArray(data.links) && data.links.length ? data.links : base.links,
    };
  } catch {
    return base;
  }
}
