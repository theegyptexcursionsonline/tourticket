export function isLocalMongoUri(uri: string): boolean {
  const normalized = uri.trim().toLowerCase();
  return /^mongodb:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/u.test(normalized);
}
