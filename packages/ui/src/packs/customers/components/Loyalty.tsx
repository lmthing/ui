import { z } from "zod";
import {
  detailOf,
  itemsOf,
  placeholderDetail,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: Streak/default cannot keep client reward stamps or redeem a completed business reward.
export const meta = {
  id: "Loyalty",
  status: "draft",
  group: "data",
  purpose: "Reward repeat clients with stamps toward a redeemable free thing.",
  pick: "A business client's four-to-twelve stamp reward card, with stamp and redeem actions. Not a habit streak (Streak) or a personal goal (Ring).",
  writeHints: [
    "stamps is a whole count from zero through of; of is a whole number from four through twelve. Code enables redeem only when full.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A count per client on the device.",
  parts: ["root", "stamps", "of", "reward", "name", "stamp", "redeem"],
  states: ["filled", "success"],
  actions: {
    parts: { stamp: ["press"], redeem: ["press"] },
    when: { stamp: { stamp: true }, redeem: { redeem: true } },
  },
} as const satisfies Meta;
export const props = z
  .strictObject({
    stamps: z.int().min(0).max(12),
    of: z.int().min(4).max(12),
    reward: text(40),
    name: text(24).optional(),
  })
  .refine(({ stamps, of }) => stamps <= of, { path: ["stamps"] })
  .overwrite((value) => ({ ...value, stamp: value.stamps < value.of, redeem: value.stamps === value.of }));
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const item = itemsOf(cast, 1)[0],
    thing = thingOf(cast);
  return {
    stamps: 0,
    of: 10,
    reward: (item && detailOf(item, 40, thing)) || placeholderDetail,
    name: (item && titleOf(item, 24, thing)) || placeholderTitle(0),
  };
}
export const examples = [
  { stamps: 3, of: 6, reward: "Your sixth plant care visit is free", name: "Anna Patel" },
  { stamps: 10, of: 10, reward: "Your tenth walk is free", name: "Ben Carter" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Loyalty");
export const probes = [
  choose(
    "Keep a stamp card for repeat customers, adding a stamp each visit and redeeming a free visit when full",
  ),
  choose("Show my current habit streak and which days this week I completed it", "Streak"),
  write("Ben Carter has seven of ten stamps; reward is Your tenth walk is free"),
  read("Add a stamp for this visit", { address: "l1/stamp", action: "press" }),
  read("Redeem Ben's free walk", { address: "l1/redeem", action: "press" }, 1),
] satisfies Probe[];
