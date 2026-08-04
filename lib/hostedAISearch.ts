export const HOSTED_AI_SEARCH_OPEN_EVENT = 'foxes:search:open';
export const HOSTED_AI_SEARCH_OPENED_EVENT = 'foxes:search:opened';

const MAX_QUERY_LENGTH = 500;
const SUPPORTED_LOCALES = new Set(['en', 'ar', 'de', 'fr', 'es']);

export interface HostedAISearchRequest {
  query: string;
  mode: 'catalog' | 'ai';
  locale: string;
  destinationSlug?: string;
}

declare global {
  interface Window {
    __foxesSearchPending?: HostedAISearchRequest | null;
  }
}

function normalizeQuery(value?: string) {
  return typeof value === 'string' ? value.trim().slice(0, MAX_QUERY_LENGTH) : '';
}

function normalizeLocale(value?: string) {
  return value && SUPPORTED_LOCALES.has(value) ? value : 'en';
}

function normalizeDestinationSlug(value?: string) {
  if (typeof value !== 'string') return undefined;
  const slug = value.trim().toLowerCase().slice(0, 96);
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : undefined;
}

export function requestHostedAISearch(input: Partial<HostedAISearchRequest>) {
  const request: HostedAISearchRequest = {
    query: normalizeQuery(input.query),
    mode: input.mode === 'ai' ? 'ai' : 'catalog',
    locale: normalizeLocale(input.locale),
    destinationSlug: normalizeDestinationSlug(input.destinationSlug),
  };

  window.__foxesSearchPending = request;
  window.dispatchEvent(new CustomEvent(HOSTED_AI_SEARCH_OPEN_EVENT, { detail: request }));
  return request;
}

export function buildHostedSearchFallbackHref(locale: string, query = '') {
  const safeLocale = normalizeLocale(locale);
  const path = safeLocale === 'en' ? '/search' : `/${safeLocale}/search`;
  const safeQuery = normalizeQuery(query);
  return safeQuery ? `${path}?q=${encodeURIComponent(safeQuery)}` : path;
}
