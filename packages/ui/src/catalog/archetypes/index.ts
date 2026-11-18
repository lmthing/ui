import * as home from "./home";
import * as dashboard from "./dashboard";
import * as list from "./list";
import * as detail from "./detail";
import * as form from "./form";
import * as checklist from "./checklist";
import * as calendar from "./calendar";
import * as tracker from "./tracker";
import * as journal from "./journal";
import * as profile from "./profile";
import * as settings from "./settings";
import * as success from "./success";
import * as onboarding from "./onboarding";
import * as capture from "./capture";
import * as chat from "./chat";
import * as plans from "./plans";
import * as browse from "./browse";
export const archetypes = {
  home,
  dashboard,
  list,
  detail,
  form,
  checklist,
  calendar,
  tracker,
  journal,
  profile,
  settings,
  success,
  onboarding,
  capture,
  chat,
  plans,
  browse,
} as const;
export type ArchetypeName = keyof typeof archetypes;
export { defaultLines } from "./defaults";
export type { ArchetypeMeta, Slot, ComposeProbe } from "./types";
