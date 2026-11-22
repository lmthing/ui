import { numberLine, pluralForm } from "../../../catalog";
import { mediaWordsFor } from "../lang";

function durationOf(seconds: number, lang?: string) {
  const words = mediaWordsFor(lang).collection;
  if (seconds < 60) return words.seconds(numberLine(seconds, lang));
  const hours = Math.floor(seconds / 3600),
    minutes = Math.floor((seconds % 3600) / 60);
  if (!hours) return words.minutes(numberLine(minutes, lang));
  const hourLine = words.hours(numberLine(hours, lang));
  return minutes ? words.duration(hourLine, words.minutes(numberLine(minutes, lang))) : hourLine;
}

/** Totals are computed from playlist rows, not from authored Collection props. */
export function collectionSummary(playlist: unknown, lang?: string): string | undefined {
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
  return words.summary(
    words.count(numberLine(count, lang), pluralForm(count, lang), episodes),
    durationOf(total, lang),
  );
}

export function collectionReading(playlist: unknown, followed: boolean, lang?: string): string[] {
  const { playAll, follow, following } = mediaWordsFor(lang).collection;
  const summary = collectionSummary(playlist, lang);
  return [...(summary ? [summary] : []), playAll, followed ? following : follow];
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
    rating: rating === undefined ? undefined : words.rating(numberLine(rating, lang)),
    ratingCount:
      ratingCount === undefined
        ? undefined
        : words.ratingCount(numberLine(ratingCount, lang), pluralForm(ratingCount, lang)),
    tags: tags?.join(" · "),
    shelfStatus,
  };
}
