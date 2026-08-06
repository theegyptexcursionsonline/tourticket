export const CATEGORY_KEYWORD_MAX_LENGTH = 50;

export interface NormalizedCategoryKeywords {
  keywords: string[];
  invalidKeywords: string[];
}

const keywordParts = (value: string) => value
  .split(/[\n,]/)
  .map((part) => part.trim())
  .filter(Boolean);

// The editor accepts an in-progress keyword draft as well as committed chips.
// Saving the form must include both, otherwise a visible value can disappear
// simply because the operator clicked Save without pressing Enter first.
export function normalizeCategoryKeywords(
  committedKeywords: unknown,
  draft = '',
): NormalizedCategoryKeywords {
  const candidates = [
    ...(Array.isArray(committedKeywords)
      ? committedKeywords.filter((value): value is string => typeof value === 'string')
      : []),
    ...keywordParts(draft),
  ];
  const keywords: string[] = [];
  const invalidKeywords: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const keyword = candidate.trim();
    if (!keyword) continue;
    if (keyword.length > CATEGORY_KEYWORD_MAX_LENGTH) {
      invalidKeywords.push(keyword);
      continue;
    }

    const key = keyword.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    keywords.push(keyword);
  }

  return { keywords, invalidKeywords };
}
