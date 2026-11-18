import { home, dashboard, list, detail, profile, browse } from "./pages";
import { checklist, calendar, tracker, journal, chat } from "./activity";
import { form, settings, success, onboarding, capture, plans } from "./flows";
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
export type { ArchetypeMeta as CoreArchetypeMeta, Slot as CoreSlot, ComposeProbe } from "./recipe";
