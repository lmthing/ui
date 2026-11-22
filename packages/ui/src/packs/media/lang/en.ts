import { words as AudioMatchWords } from "./en/AudioMatch";
import { words as ChapterListWords } from "./en/ChapterList";
import { words as CollectionWords } from "./en/Collection";
import { words as HighlightsWords } from "./en/Highlights";
import { words as LibraryWords } from "./en/Library";
import { words as MiniPlayerWords } from "./en/MiniPlayer";
import { words as PlaylistWords } from "./en/Playlist";
import { words as TranscriptWords } from "./en/Transcript";

export const en = {
  ...AudioMatchWords,
  ...ChapterListWords,
  ...CollectionWords,
  ...HighlightsWords,
  ...LibraryWords,
  ...MiniPlayerWords,
  ...PlaylistWords,
  ...TranscriptWords,
};

export type MediaWords = typeof en;
