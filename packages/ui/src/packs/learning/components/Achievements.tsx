import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Streak/default cannot list distinct earned and locked milestones with dates and criteria.
export const meta = {
  id: "Achievements",
  status: "draft",
  group: "data",
  purpose: "See the learning badges you earned and how to unlock the rest.",
  pick: "A grid of learning milestone badges with earned dates and unlock criteria. Not consecutive days of a habit (Streak), photos (Gallery) or redeemable rewards (Rewards).",
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Learning milestones are checked on the device.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: ["root"],
  items: { key: "badges", parts: ["root", "title", "icon", "earned", "how"] },
  states: ["filled", "empty"],
  actions: { items: { root: ["press"] } },
  read: (input, _state, lang): string[] =>
    (input as z.output<typeof props>).badges.flatMap(({ earned }, index) =>
      earned ? [`r${index + 1}: ${c.appointmentDate(earned, lang)}`] : [],
    ),
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  badges: z
    .array(
      z.strictObject({
        title: c.text(20),
        icon: c.icon,
        earned: c.isoDate.optional(),
        how: c.text(48).optional(),
      }),
    )
    .min(2)
    .max(12),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 6);
  return {
    badges: Array.from({ length: Math.max(2, items.length) }, (_, index) => {
      const item = items[index];
      return {
        title: (item && c.titleOf(item, 20, thing)) ?? c.placeholderTitle(index, lang),
        icon: "award",
        how: item && c.detailOf(item, 48, thing),
      };
    }),
  };
}

export const examples = [
  {
    badges: [
      { title: "First kanji", icon: "star", earned: "2026-10-04" },
      { title: "Radical reader", icon: "drop", how: "Master 20 characters with the water radical." },
    ],
  },
  {
    density: "compact",
    surface: "outlined",
    badges: [
      { title: "Perfect pitch drill", icon: "music", earned: "2026-09-08" },
      { title: "Keys unlocked", icon: "key", how: "Name all 12 major key signatures." },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Achievements");
export const probes = [
  choose(
    "Show earned and locked milestone badges as a grid, with the date each was earned or what I have to do to earn it.",
  ),
  choose(
    "Show my twelve consecutive days of studying and the days I studied this week. No badges or milestones.",
    "Streak",
  ),
  write(
    "Give me two badges: First kanji with a star, earned on 2026-10-04, and Radical reader with a drop, unlocked by mastering 20 water-radical characters.",
  ),
  read("Open the Radical reader badge to see how to earn it.", { address: "a1/r2", action: "press" }),
] satisfies c.Probe[];
