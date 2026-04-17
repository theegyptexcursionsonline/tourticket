export function slugifyAuthorName(value?: string | null) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getAuthorRouteSlug(author?: { slug?: string | null; name?: string | null } | null) {
  const preferred = author?.slug || author?.name;
  return slugifyAuthorName(preferred);
}

export function matchesAuthorSlug(authorName: string | undefined, candidateSlug: string) {
  return slugifyAuthorName(authorName) === slugifyAuthorName(candidateSlug);
}
