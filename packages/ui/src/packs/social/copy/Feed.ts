import { numberLine, pluralForm, type StateName } from "../../../catalog";
import { socialWordsFor } from "../lang";

type Counts = { likes: number; comments: number };

export function feedCountParts(counts: Counts, lang?: string) {
  const { feed } = socialWordsFor(lang);
  return (["likes", "comments"] as const).map((part) => {
    const value = counts[part];
    return { part, count: numberLine(value, lang), ...feed[part](pluralForm(value, lang)) };
  });
}

export function feedReading(input: unknown, state: StateName, lang?: string): string[] {
  if (state !== "filled") return [];
  const { posts } = input as { posts: Counts[] };
  const { feed } = socialWordsFor(lang);
  return posts.map((post, index) => {
    const counts = feedCountParts(post, lang).map(
      ({ count, before = "", after = "" }) => before + count + after,
    );
    return `r${index + 1}: ${counts.join(feed.countSeparator)}`;
  });
}
