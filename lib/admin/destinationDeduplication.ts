type DestinationLike = Record<string, unknown> & {
  _id?: unknown;
  name?: string | null;
  slug?: string | null;
  tourCount?: number | null;
  featured?: boolean | null;
  isPublished?: boolean | null;
  image?: string | null;
  description?: string | null;
};

export type AdminDestination = DestinationLike & {
  duplicateIds: string[];
  duplicateCount: number;
  tourCount: number;
};

const normalizeText = (value: unknown) => String(value || '').trim().toLowerCase();

export const normalizeDestinationSlug = (value: unknown) =>
  normalizeText(value)
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

const idToString = (value: unknown) => {
  if (!value) return '';
  if (typeof value === 'object' && value !== null && 'toString' in value) {
    return String(value.toString());
  }
  return String(value);
};

const getDestinationKey = (destination: DestinationLike) => {
  const slug = normalizeDestinationSlug(destination.slug);
  if (slug) return `slug:${slug}`;

  const name = normalizeText(destination.name);
  if (name) return `name:${name}`;

  const id = idToString(destination._id);
  return id ? `id:${id}` : '';
};

const scoreDestination = (destination: DestinationLike, tourCount: number) =>
  tourCount * 100 +
  (destination.featured ? 25 : 0) +
  (destination.isPublished !== false ? 10 : 0) +
  (destination.image ? 5 : 0) +
  (destination.description ? 2 : 0);

const normalizeCount = (value: unknown) => {
  const count = Number(value);
  return Number.isFinite(count) ? count : 0;
};

export function dedupeAdminDestinations<T extends DestinationLike>(
  destinations: T[],
  tourCountsByDestinationId: Record<string, number> = {}
): AdminDestination[] {
  const groups = new Map<
    string,
    {
      canonical: AdminDestination;
      score: number;
      tourCount: number;
      duplicateIds: string[];
    }
  >();

  for (const destination of destinations) {
    const key = getDestinationKey(destination);
    if (!key) continue;

    const id = idToString(destination._id);
    const tourCount = normalizeCount(tourCountsByDestinationId[id] ?? destination.tourCount);
    const score = scoreDestination(destination, tourCount);
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        canonical: {
          ...destination,
          tourCount,
          duplicateIds: id ? [id] : [],
          duplicateCount: id ? 1 : 0,
        },
        score,
        tourCount,
        duplicateIds: id ? [id] : [],
      });
      continue;
    }

    existing.tourCount += tourCount;
    if (id && !existing.duplicateIds.includes(id)) {
      existing.duplicateIds.push(id);
    }

    if (score > existing.score) {
      existing.canonical = {
        ...destination,
        tourCount: existing.tourCount,
        duplicateIds: existing.duplicateIds,
        duplicateCount: existing.duplicateIds.length,
      };
      existing.score = score;
    } else {
      existing.canonical.tourCount = existing.tourCount;
      existing.canonical.duplicateIds = existing.duplicateIds;
      existing.canonical.duplicateCount = existing.duplicateIds.length;
    }
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group.canonical,
      tourCount: group.tourCount,
      duplicateIds: group.duplicateIds,
      duplicateCount: group.duplicateIds.length,
    }))
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
}
