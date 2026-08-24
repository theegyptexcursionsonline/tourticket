export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isBoundedString(value: unknown, minimum: number, maximum: number): value is string {
  if (typeof value !== 'string' || value.length > maximum) return false;
  const length = value.trim().length;
  return length >= minimum && length <= maximum;
}

export function isBoundedStringArray(
  value: unknown,
  minimumItems: number,
  maximumItems: number,
  minimumLength: number,
  maximumLength: number,
): value is string[] {
  return (
    Array.isArray(value) &&
    value.length >= minimumItems &&
    value.length <= maximumItems &&
    value.every((entry) => isBoundedString(entry, minimumLength, maximumLength))
  );
}

export function isSafeHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2_048) return false;
  try {
    const url = new URL(value);
    // The Content Engine uploads receiver heroes to the EEO-owned Cloudinary
    // account. Matching that exact delivery namespace prevents a compromised
    // publisher credential from turning Next Image optimization into an SSRF
    // fetcher or persisting an attacker-controlled tracking asset.
    return (
      url.protocol === 'https:' &&
      url.hostname === 'res.cloudinary.com' &&
      url.pathname.startsWith('/dm3sxllch/') &&
      !url.username &&
      !url.password &&
      !url.hash
    );
  } catch {
    return false;
  }
}

export function isTranslationEnvelope(value: unknown): boolean {
  if (value === undefined) return true;
  if (!isPlainRecord(value)) return false;

  const entries = Object.entries(value);
  return (
    entries.length <= 32 &&
    entries.every(
      ([locale, bucket]) =>
        locale.length > 0 &&
        locale.length <= 32 &&
        /^[A-Za-z0-9-]+$/.test(locale) &&
        isPlainRecord(bucket),
    )
  );
}
