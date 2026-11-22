import { numberLine, type StateName } from "../../../catalog";
import { socialWordsFor } from "../lang";

type StoryReading = {
  author: string;
  current: number;
  slides: readonly { time: string; caption?: string; sticker?: { label: string } }[];
};

export function storyViewerReading(input: unknown, state: StateName, lang?: string): string[] {
  const words = socialWordsFor(lang).storyViewer;
  if (state === "empty") return [words.expired];
  if (state === "success") return [words.sent];
  if (state === "loading") return [];
  const { author, current, slides } = input as StoryReading;
  const slide = slides[current];
  if (!slide) return [];
  return [
    author,
    words.position(numberLine(current + 1, lang), numberLine(slides.length, lang)),
    slide.time,
    ...(slide.caption ? [slide.caption] : []),
    ...(slide.sticker ? [slide.sticker.label] : []),
  ];
}
