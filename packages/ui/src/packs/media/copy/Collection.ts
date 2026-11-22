import { numberLine, pluralForm } from "../../../catalog";
import { mediaWordsFor } from "../lang";

type Figure = { value: string; unit: string };
type Style = "show" | "album" | "book";
const phrase = ({ value, unit }: Figure) => `${value} ${unit}`;

function durationOf(seconds: number, lang?: string) {
  const words = mediaWordsFor(lang).collection;
  if (seconds < 60) return [{ value: numberLine(seconds, lang), unit: words.seconds }];
  const hours = Math.floor(seconds / 3600),
    minutes = Math.floor((seconds % 3600) / 60);
  return [
    ...(hours ? [{ value: numberLine(hours, lang), unit: words.hours }] : []),
    ...(minutes ? [{ value: numberLine(minutes, lang), unit: words.minutes }] : []),
  ];
}

/** Totals are computed from playlist rows, not from authored Collection props. */
export function collectionFigures(playlist: unknown, lang?: string, style?: Style) {
  if (!playlist || typeof playlist !== "object" || !("items" in playlist)) return;
  if ("state" in playlist && playlist.state !== undefined && playlist.state !== "filled") return;
  const { items } = playlist;
  if (!Array.isArray(items) || !items.length) return;
  let total = 0;
  for (const item of items as unknown[]) {
    const value = item && typeof item === "object" && "seconds" in item ? item.seconds : undefined;
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) return;
    total += value;
  }
  if (!Number.isSafeInteger(total)) return;
  const words = mediaWordsFor(lang).collection;
  const count = items.length;
  const episodes = "style" in playlist && playlist.style === "episodes";
  const kind = episodes ? "episode" : style === "book" ? "chapter" : "track";
  return {
    count: { value: numberLine(count, lang), unit: words.count(pluralForm(count, lang), kind) },
    duration: durationOf(total, lang),
  };
}

export function collectionSummary(playlist: unknown, lang?: string, style?: Style): string | undefined {
  const figures = collectionFigures(playlist, lang, style);
  return (
    figures &&
    mediaWordsFor(lang).collection.summary(phrase(figures.count), figures.duration.map(phrase).join(" "))
  );
}

export function collectionPlayLabel(style?: Style, lang?: string) {
  const { playAll, playBook } = mediaWordsFor(lang).collection;
  return style === "book" ? playBook : playAll;
}

export function collectionReading(
  playlist: unknown,
  followed: boolean,
  lang?: string,
  style?: Style,
): string[] {
  const { follow, following } = mediaWordsFor(lang).collection;
  const summary = collectionSummary(playlist, lang, style);
  return [...(summary ? [summary] : []), collectionPlayLabel(style, lang), followed ? following : follow];
}

type CollectionExtras = {
  rating?: number | undefined;
  ratingCount?: number | undefined;
  tags?: readonly string[] | undefined;
  shelfStatus?: string | undefined;
};

export function collectionExtras(input: CollectionExtras, lang?: string) {
  const words = mediaWordsFor(lang).collection;
  const { rating, ratingCount, tags, shelfStatus } = input;
  return {
    rating:
      rating === undefined
        ? undefined
        : { value: numberLine(rating, lang), unit: words.rating(numberLine(5, lang)) },
    ratingCount:
      ratingCount === undefined
        ? undefined
        : { value: numberLine(ratingCount, lang), unit: words.ratingCount(pluralForm(ratingCount, lang)) },
    tags: tags?.join(" · "),
    shelfStatus,
  };
}

export function collectionExtraReading(input: CollectionExtras, lang?: string): string[] {
  const { rating, ratingCount, tags, shelfStatus } = collectionExtras(input, lang);
  return [rating && phrase(rating), ratingCount && phrase(ratingCount), tags, shelfStatus].filter(
    (value): value is string => Boolean(value),
  );
}
