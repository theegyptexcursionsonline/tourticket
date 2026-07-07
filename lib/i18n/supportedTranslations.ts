import { locales } from '@/i18n/config';

// Drops translation entries for locales this site doesn't serve. The content
// engine can target sites with different locale sets, so the receiver enforces
// its own allow-list instead of trusting the payload. Regioned codes count as
// their base locale ('de-DE' → 'de') since readers resolve buckets that way.
export function filterSupportedTranslations<T>(
  translations: Record<string, T> | undefined | null,
  supported: readonly string[] = locales,
): { translations: Record<string, T>; droppedLocales: string[] } {
  const allowed = new Set(supported.map((l) => l.toLowerCase()));
  const kept: Record<string, T> = {};
  const droppedLocales: string[] = [];

  for (const [key, value] of Object.entries(translations ?? {})) {
    const normalized = key.toLowerCase();
    const base = normalized.split('-')[0];
    if (allowed.has(normalized) || allowed.has(base)) {
      kept[key] = value;
    } else {
      droppedLocales.push(key);
    }
  }

  return { translations: kept, droppedLocales };
}
