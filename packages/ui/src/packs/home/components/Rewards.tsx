import { homeWordsFor } from "../lang";
import { z } from "zod";
import {
  icon,
  itemsOf,
  photo,
  placeholderTitle,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: Ring/md tracks one goal, not children's points spent on claimable prizes.
export const meta = {
  id: "Rewards",
  status: "draft",
  group: "data",
  purpose: "Keep children's earned points or pocket money and claim prizes they can afford.",
  pick: "Children's points earned and spent on prizes with costs. Not one person's goal (Ring), a business stamp card (Loyalty), or milestone badges (Achievements).",
  writeHints: [
    "Write stored points and prize costs as nonnegative numbers. Claimability and balances after a claim are computed, never written. money means pocket money; never write a currency.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A parent keeps points and prize claims on the device.",
  items: { key: "entries", parts: ["root", "name", "photo", "points", "title", "cost", "icon", "claim"] },
  parts: ["root"],
  confirmParts: ["claim"],
  states: ["filled", "success"],
  actions: {
    items: { root: ["press"], claim: ["press"] },
    when: { root: { entryKind: "kid" }, claim: { entryKind: "prize", claimable: true } },
  },
  read: (input, state, lang?: string) => {
    const { rewardLabels } = homeWordsFor(lang);

    if (state !== "filled") return [];
    const { kids, prizes, entries } = input as z.output<typeof props> & { entries: { id?: string }[] };
    return [
      ...kids.map(
        (kid, index) => `${entries[index]?.id ?? ""} ${kid.name}: ${kid.points} ${rewardLabels.points}`,
      ),
      ...prizes.map(
        (prize, index) =>
          `${entries[kids.length + index]?.id ?? ""} ${prize.title}: ${rewardLabels.cost} ${prize.cost}`,
      ),
      rewardLabels.claim,
    ];
  },
} as const satisfies Meta;
export const props = z
  .strictObject({
    kids: z
      .array(
        z.strictObject({
          name: text(16),
          photo: photo.optional(),
          points: z.number().min(0),
          goto: screenId,
        }),
      )
      .min(1)
      .max(4),
    prizes: z
      .array(z.strictObject({ title: text(24), cost: z.number().min(0), icon }))
      .min(1)
      .max(6),
    money: z.boolean().default(false),
  })
  .overwrite((value) => ({
    ...value,
    entries: [
      ...value.kids.map((kid) => ({ ...kid, entryKind: "kid" })),
      ...value.prizes.map((prize) => ({
        ...prize,
        entryKind: "prize",
        claimable: value.kids.some((kid) => kid.points >= prize.cost),
      })),
    ],
  }));
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast),
    items = itemsOf(cast, 4);
  return {
    kids: (items.length ? items : [undefined]).map((item, index) => ({
      name: item
        ? (titleOf(item, 16, thing) ?? placeholderTitle(index, lang))
        : placeholderTitle(index, lang),
      points: 0,
      goto: item && screenId.safeParse(item.id).success ? item.id : "detail",
    })),
    prizes: [{ title: placeholderTitle(0, lang), cost: 1, icon: "star" }],
    money: false,
  };
}
export const examples = [
  {
    kids: [{ name: "Mia", photo: "lib:people", points: 20, goto: "mia" }],
    prizes: [{ title: "Choose a new plant", cost: 15, icon: "leaf" }],
    money: false,
  },
  {
    kids: [{ name: "Leo", photo: "lib:people", points: 8, goto: "leo" }],
    prizes: [{ title: "Dog park picnic", cost: 5, icon: "heart" }],
    money: true,
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Rewards");
export const probes = [
  choose("Children earn points and spend them on a shelf of prizes with costs and a claim button"),
  choose("Show how far I am toward one goal of twenty walks", "Ring"),
  write("Mia has twenty points, can claim Choose a new plant for fifteen points, her details are mia"),
  read("Claim Choose a new plant", { address: "r1/r2/claim", action: "press" }),
] satisfies Probe[];
