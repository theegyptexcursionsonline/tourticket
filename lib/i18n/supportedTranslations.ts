import { defaultLocale, locales } from '@/i18n/config';

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

// Resolves the language the engine's base `payload` is written in.
//
// The engine targets sites with different locale sets, so a publish can arrive
// with `defaultLocale: 'de'` while the base payload holds German strings. The
// receiver validates that language against its own allow-list (defence in depth
// — never trust the payload) and rejects anything it cannot serve, rather than
// silently filing foreign-language content as English.
//
// Returns `{ ok: true, baseLocale }` or `{ ok: false, error }` for a locale this
// site cannot serve.
export type BaseLocaleResolution =
  | { ok: true; baseLocale: string }
  | { ok: false; error: string };

export function resolveBaseLocale(
  input: unknown,
  supported: readonly string[] = locales,
  siteDefault: string = defaultLocale,
): BaseLocaleResolution {
  if (input === undefined || input === null) return { ok: true, baseLocale: siteDefault };
  if (typeof input !== 'string') {
    return { ok: false, error: 'defaultLocale must be a string' };
  }

  const normalized = input.trim().toLowerCase();
  if (!normalized) return { ok: true, baseLocale: siteDefault };

  const allowed = new Set(supported.map((l) => l.toLowerCase()));
  if (allowed.has(normalized)) return { ok: true, baseLocale: normalized };

  // Regioned codes resolve to their base locale ('de-DE' → 'de'), matching how
  // readers look up translation buckets.
  const base = normalized.split('-')[0];
  if (allowed.has(base)) return { ok: true, baseLocale: base };

  return {
    ok: false,
    error: `defaultLocale "${input}" is not served by this site (supported: ${supported.join(', ')})`,
  };
}

// Files the base payload under its own language bucket when the engine wrote it
// in something other than this site's default locale.
//
// The root document fields stay as sent (they remain the fallback for every
// locale), but a reader asking for `baseLocale` now resolves the real language
// instead of falling through to content written in another one. An explicit
// translation for that locale always wins over the mirrored base payload.
export function withBaseLocaleBucket<T>(
  translations: Record<string, T>,
  baseLocale: string,
  baseBucket: T,
  siteDefault: string = defaultLocale,
): Record<string, T> {
  if (baseLocale === siteDefault) return translations;

  const alreadyProvided = Object.keys(translations).some(
    (key) => key.toLowerCase() === baseLocale || key.toLowerCase().split('-')[0] === baseLocale,
  );
  if (alreadyProvided) return translations;

  return { ...translations, [baseLocale]: baseBucket };
}
