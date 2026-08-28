export interface ContextualDiscoveryLink {
  href: string;
  label: string;
}

/** Keep contextual navigation small, canonical, unique, and useful. */
export function normalizeContextualDiscoveryLinks(
  links: readonly ContextualDiscoveryLink[],
  limit = 6,
): ContextualDiscoveryLink[] {
  if (!Number.isInteger(limit) || limit <= 0) return [];

  const seen = new Set<string>();
  const normalized: ContextualDiscoveryLink[] = [];

  for (const link of links) {
    const href = link.href.trim();
    const label = link.label.replace(/\s+/g, ' ').trim();
    if (!label || !href.startsWith('/') || href.startsWith('//') || /[?#]/.test(href)) continue;
    if (seen.has(href)) continue;
    seen.add(href);
    normalized.push({ href, label });
    if (normalized.length === limit) break;
  }

  return normalized;
}
