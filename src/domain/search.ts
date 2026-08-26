import { z } from "zod";

export const societySearchQuerySchema = z.string().trim().min(2).max(100);
export const societySearchKindSchema = z.enum(["wiki", "people", "onboarding", "teams"]);

export const societySearchResultSchema = z.object({
  excerpt: z.string().max(240),
  href: z.string().startsWith("/"),
  icon: z.string().min(1).max(8),
  id: z.string().min(1),
  kind: societySearchKindSchema,
  title: z.string().min(1).max(140),
});

export const societySearchResponseSchema = z.object({
  results: z.array(societySearchResultSchema).max(15),
});

export type SocietySearchKind = z.infer<typeof societySearchKindSchema>;
export type SocietySearchResult = z.infer<typeof societySearchResultSchema>;

export type SocietySearchDocument = SocietySearchResult & {
  body?: string;
  keywords?: string[];
};

type RankedResult = SocietySearchResult & { score: number };
const questionWords = new Set([
  "a", "an", "are", "can", "do", "does", "for", "how", "i", "in", "is",
  "of", "our", "the", "to", "what", "when", "where", "which", "who", "with",
]);

export function rankSocietySearchDocuments(
  query: string,
  documents: SocietySearchDocument[],
  limit = 12,
): SocietySearchResult[] {
  const normalisedQuery = normalise(query);
  if (normalisedQuery.length < 2) return [];
  const queryTokens = normalisedQuery.split(" ").filter(Boolean);
  const meaningfulTokens = queryTokens.filter((token) => !questionWords.has(token));
  const tokens = meaningfulTokens.length ? meaningfulTokens : queryTokens;

  return documents
    .map((document): RankedResult | null => {
      const title = normalise(document.title);
      const excerpt = normalise(document.excerpt);
      const body = normalise(document.body ?? "");
      const keywords = normalise(document.keywords?.join(" ") ?? "");
      const wholeDocument = `${title} ${excerpt} ${keywords} ${body}`;
      if (!tokens.every((token) => wholeDocument.includes(token))) return null;

      let score = 0;
      if (title === normalisedQuery) score += 220;
      else if (title.startsWith(normalisedQuery)) score += 130;
      else if (title.includes(normalisedQuery)) score += 90;
      if (keywords.includes(normalisedQuery)) score += 45;
      if (excerpt.includes(normalisedQuery)) score += 28;
      if (body.includes(normalisedQuery)) score += 8;

      for (const token of tokens) {
        if (title.split(" ").some((word) => word === token)) score += 38;
        else if (title.split(" ").some((word) => word.startsWith(token))) score += 24;
        else if (title.includes(token)) score += 16;
        score += Math.min(countOccurrences(keywords, token), 3) * 10;
        if (excerpt.includes(token)) score += 6;
        if (body.includes(token)) score += 2;
      }

      return { ...toResult(document, tokens), score };
    })
    .filter((result): result is RankedResult => Boolean(result))
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .slice(0, Math.max(0, Math.min(limit, 15)))
    .map(stripScore);
}

function stripScore({ score, ...result }: RankedResult): SocietySearchResult {
  void score;
  return result;
}

function toResult(document: SocietySearchDocument, tokens: string[]): SocietySearchResult {
  const preferredExcerpt = document.excerpt.trim()
    || excerptAroundMatch(document.body ?? "", tokens)
    || "Open this result";
  return societySearchResultSchema.parse({
    excerpt: truncate(cleanText(preferredExcerpt), 220),
    href: document.href,
    icon: document.icon,
    id: document.id,
    kind: document.kind,
    title: document.title,
  });
}

function excerptAroundMatch(value: string, tokens: string[]) {
  const cleaned = cleanText(value);
  const lower = normalise(cleaned);
  const match = tokens
    .map((token) => lower.indexOf(token))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];
  if (match === undefined) return cleaned;
  const start = Math.max(0, match - 55);
  return `${start ? "…" : ""}${cleaned.slice(start, start + 205)}${start + 205 < cleaned.length ? "…" : ""}`;
}

function cleanText(value: string) {
  return value
    .replace(/[#>*_`\[\]()~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalise(value: string) {
  return cleanText(value).toLocaleLowerCase();
}

function truncate(value: string, length: number) {
  return value.length <= length ? value : `${value.slice(0, length - 1).trimEnd()}…`;
}

function countOccurrences(value: string, token: string) {
  if (!token) return 0;
  return value.split(token).length - 1;
}
