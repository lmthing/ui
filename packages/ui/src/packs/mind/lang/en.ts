import { words as ThoughtRecordWords } from "./en/ThoughtRecord";
import { words as SoundscapeWords } from "./en/Soundscape";
import { words as FeelingsWords } from "./en/Feelings";
import { words as SleepLogWords } from "./en/SleepLog";
import { words as BreatheWords } from "./en/Breathe";
import { words as EntriesWords } from "./en/Entries";
import { words as PatternsWords } from "./en/Patterns";
export const en = {
  ...ThoughtRecordWords,
  ...SoundscapeWords,
  ...FeelingsWords,
  ...SleepLogWords,
  ...BreatheWords,
  ...EntriesWords,
  ...PatternsWords,
};

export type MindWords = typeof en;
