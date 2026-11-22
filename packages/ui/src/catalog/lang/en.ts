import { words as SwipeStackWords } from "./en/SwipeStack";
import { words as SparklineWords } from "./en/Sparkline";
import { words as StepsWords } from "./en/Steps";
import { words as PlayerWords } from "./en/Player";
import { words as packWords } from "./en/pack";
import { words as SearchWords } from "./en/Search";
import { words as ComposerWords } from "./en/Composer";
import { words as SheetWords } from "./en/Sheet";
import { words as CalendarWords } from "./en/Calendar";
import { words as SuccessWords } from "./en/Success";
import { words as FieldWords } from "./en/Field";
import { words as KeyValueWords } from "./en/KeyValue";
import { words as PeopleWords } from "./en/People";
import { words as MapPinsWords } from "./en/MapPins";
import { words as BarsWords } from "./en/Bars";
import { words as CounterWords } from "./en/Counter";
import { words as ListWords } from "./en/List";
import { words as TimerWords } from "./en/Timer";
import { words as StreakWords } from "./en/Streak";
import { words as CameraWords } from "./en/Camera";
import { words as BubblesWords } from "./en/Bubbles";
import { words as AmountWords } from "./en/Amount";
import { words as RouteWords } from "./en/Route";
import { words as FilterBarWords } from "./en/FilterBar";
import { words as ReviewWords } from "./en/Review";
import { words as ArticleWords } from "./en/Article";
import { words as PassCardWords } from "./en/PassCard";
import { words as FileListWords } from "./en/FileList";

export const en = {
  ...SwipeStackWords,
  ...SparklineWords,
  ...StepsWords,
  ...PlayerWords,
  ...packWords,
  ...SearchWords,
  ...ComposerWords,
  ...SheetWords,
  ...CalendarWords,
  ...SuccessWords,
  ...FieldWords,
  ...KeyValueWords,
  ...PeopleWords,
  ...MapPinsWords,
  ...BarsWords,
  ...CounterWords,
  ...ListWords,
  ...TimerWords,
  ...StreakWords,
  ...CameraWords,
  ...BubblesWords,
  ...AmountWords,
  ...RouteWords,
  ...FilterBarWords,
  ...ReviewWords,
  ...ArticleWords,
  ...PassCardWords,
  ...FileListWords,
};

export type Words = typeof en;
