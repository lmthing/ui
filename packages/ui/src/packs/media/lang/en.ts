import { words as ChapterListWords } from "./en/ChapterList";
import { words as CollectionWords } from "./en/Collection";
import { words as HighlightsWords } from "./en/Highlights";
import { words as LibraryWords } from "./en/Library";
import { words as MiniPlayerWords } from "./en/MiniPlayer";
import { words as PlaylistWords } from "./en/Playlist";

export const en = {
  ...ChapterListWords,
  ...CollectionWords,
  ...HighlightsWords,
  ...LibraryWords,
  ...MiniPlayerWords,
  ...PlaylistWords,
};

export type MediaWords = typeof en;
