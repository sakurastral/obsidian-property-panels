export interface FuzzyMatch<T> {
  item: T;
  score: number;
  index: number;
}

export function fuzzyFilter<T>(items: T[], query: string, text: (item: T) => string): T[] {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return items;
  return items
    .map((item, index) => {
      const candidate = normalize(text(item));
      const scores = tokens.map((token) => fuzzyTokenScore(candidate, token));
      if (scores.some((score) => score === undefined)) return undefined;
      return { item, index, score: scores.reduce<number>((total, score) => total + (score ?? 0), 0) };
    })
    .filter((match): match is FuzzyMatch<T> => match !== undefined)
    .sort((left, right) => left.score - right.score || left.index - right.index)
    .map((match) => match.item);
}

export function appendCustomOption<T>(
  items: T[],
  query: string,
  selected: string[],
  allowCustom: boolean,
  create: (value: string) => T
): T[] {
  const value = query.trim();
  return value && allowCustom && !selected.includes(value) ? [create(value), ...items] : items;
}

function fuzzyTokenScore(candidate: string, token: string): number | undefined {
  const contiguous = candidate.indexOf(token);
  if (contiguous >= 0) return contiguous;
  let position = -1;
  let gap = 0;
  for (const character of token) {
    const next = candidate.indexOf(character, position + 1);
    if (next < 0) return undefined;
    if (position >= 0) gap += next - position - 1;
    position = next;
  }
  return candidate.length + gap;
}

function normalize(value: string): string {
  return value.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase();
}
