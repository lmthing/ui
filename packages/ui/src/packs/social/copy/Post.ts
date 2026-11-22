import { localeOf, type StateName } from "../../../catalog";
import { socialWordsFor } from "../lang";
import { feedCountParts } from "./Feed";
import { postExtraReading, type PostExtras } from "./post-options";

type Counts = { likes: number; comments: number };

export function postCountParts(input: Counts, lang?: string) {
  const [likes, comments] = feedCountParts(input, lang);
  const short = new Intl.NumberFormat(localeOf(lang), { notation: "compact", maximumFractionDigits: 1 });
  const line = ({ part, count, before = "", after = "" }: NonNullable<typeof likes>) => ({
    part,
    count: short.format(input[part]),
    line: before + count + after,
  });
  return [line(likes!), line(comments!)] as const;
}

export function postReading(input: unknown, state: StateName, lang?: string): string[] {
  if (state !== "filled") return [];
  const post = input as Counts & PostExtras & { media: string; images: string[] };
  const { countSeparator } = socialWordsFor(lang).feed;
  const photos = post.media === "none" ? [] : post.images;
  return [
    postCountParts(post, lang)
      .map(({ line }) => line)
      .join(countSeparator),
    ...photos.map((photo) => `photo:${photo.replace(/^lib:/, "")}`),
    ...postExtraReading(post, post.media !== "none", lang),
  ];
}
