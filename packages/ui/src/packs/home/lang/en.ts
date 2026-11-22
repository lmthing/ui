import { words as AgendaWords } from "./en/Agenda";
import { words as BabyLogWords } from "./en/BabyLog";
import { words as CameraFeedWords } from "./en/CameraFeed";
import { words as CareScheduleWords } from "./en/CareSchedule";
import { words as packWords } from "./en/pack";
import { words as ChoresWords } from "./en/Chores";
import { words as DevicesWords } from "./en/Devices";
import { words as RewardsWords } from "./en/Rewards";
import { words as RoutinesWords } from "./en/Routines";
import { words as TurnsWords } from "./en/Turns";

export const en = {
  ...AgendaWords,
  ...BabyLogWords,
  ...CameraFeedWords,
  ...CareScheduleWords,
  ...packWords,
  ...ChoresWords,
  ...DevicesWords,
  ...RewardsWords,
  ...RoutinesWords,
  ...TurnsWords,
};

export type HomeWords = typeof en;
