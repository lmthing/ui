import { words as TeamPickerWords } from "./en/TeamPicker";
import { words as TurnOrderWords } from "./en/TurnOrder";
import { words as ScoreSheetWords } from "./en/ScoreSheet";
import { words as TriviaWords } from "./en/Trivia";
import { words as DiceWords } from "./en/Dice";
import { words as SpinnerWords } from "./en/Spinner";
export const en = {
  ...TeamPickerWords,
  ...TurnOrderWords,
  ...ScoreSheetWords,
  ...TriviaWords,
  ...DiceWords,
  ...SpinnerWords,
};

export type PlayWords = typeof en;
