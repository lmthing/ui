import { home, dashboard, list, detail, profile, browse } from "./pages";
import { checklist, calendar, tracker, journal, chat } from "./activity";
import { form, settings, success, onboarding, capture, plans, signin, signup, verify } from "./flows";
import type { ArchetypeMeta } from "../meta";
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
  signin,
  signup,
  verify,
} as const;
export type ArchetypeName = keyof typeof archetypes;
export type ArchetypeOverrides = Partial<Record<ArchetypeName, Readonly<ArchetypeMeta["layouts"]>>>;
export { defaultLines } from "./defaults";
export { packListDefaults } from "./pack-list-defaults";
export type { ArchetypeMeta as CoreArchetypeMeta, Slot as CoreSlot, ComposeProbe } from "./recipe";
