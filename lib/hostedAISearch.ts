export const HOSTED_AI_SEARCH_OPEN_EVENT = 'foxes:search:open';
export const HOSTED_AI_SEARCH_OPENED_EVENT = 'foxes:search:opened';
// EEOSearchConcierge adds this script only on routes where the launcher may run.
export const HOSTED_AI_SEARCH_SCRIPT_ID = 'eeo-search-concierge-script';

const MAX_QUERY_LENGTH = 500;
// The launcher bundle loads asynchronously; give it this long to accept a request.
const LAUNCHER_ACCEPT_TIMEOUT_MS = 2200;
// How long a request carried to the search page may wait for that page's launcher.
const CARRIED_REQUEST_TTL_MS = 15000;
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

let acceptTimer: number | null = null;
let carriedRequestTimer: number | null = null;

/**
 * A visitor's explicit "Ask AI": open the hosted AI Search with their question.
 *
 * The launcher is not mounted on every route (checkout, sign-in, tools...) and
 * loads asynchronously, so a request nothing accepts moves to the search page,
 * whose launcher picks the same pending request up when it boots. Either way
 * the visitor reaches the assistant with their question, never a dead control.
 */
export function askHostedAISearch(
  input: Omit<Partial<HostedAISearchRequest>, 'mode'>,
  navigate: (href: string) => void,
) {
  if (acceptTimer !== null) window.clearTimeout(acceptTimer);
  if (carriedRequestTimer !== null) window.clearTimeout(carriedRequestTimer);
  acceptTimer = null;
  carriedRequestTimer = null;

  const request = requestHostedAISearch({ ...input, mode: 'ai' });

  const carryToSearchPage = () => {
    acceptTimer = null;
    // Accepted here, or replaced by a newer request: nothing to carry.
    if (window.__foxesSearchPending !== request) return;
    navigate(buildHostedSearchFallbackHref(request.locale, request.query));
    // Drop the request if no launcher takes it, so it cannot open the
    // assistant later on an unrelated page.
    carriedRequestTimer = window.setTimeout(() => {
      carriedRequestTimer = null;
      if (window.__foxesSearchPending === request) window.__foxesSearchPending = null;
    }, CARRIED_REQUEST_TTL_MS);
  };

  if (document.getElementById(HOSTED_AI_SEARCH_SCRIPT_ID)) {
    acceptTimer = window.setTimeout(carryToSearchPage, LAUNCHER_ACCEPT_TIMEOUT_MS);
  } else {
    carryToSearchPage();
  }
  return request;
}
