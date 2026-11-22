import { numberLine, pluralForm, type StateName } from "../../../catalog";
import { socialWordsFor } from "../lang";
import { postExtraReading, type PostExtras } from "./post-options";

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
  const { posts, media } = input as { posts: (Counts & PostExtras)[]; media?: string };
  const { feed } = socialWordsFor(lang);
  return posts.map((post, index) => {
    const counts = feedCountParts(post, lang).map(
      ({ count, before = "", after = "" }) => before + count + after,
    );
    return `r${index + 1}: ${[...counts, ...postExtraReading(post, media !== "none", lang)].join(feed.countSeparator)}`;
  });
}
