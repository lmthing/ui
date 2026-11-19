import { z } from "zod";
import {
  itemsOf,
  photo,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
} from "../../../catalog";
import { turnLabels } from "../copy";

// Core first: People/stack lists people, not a current duty holder and an advancing rotation.
export const meta = {
  id: "Turns",
  status: "draft",
  group: "data",
  purpose: "Rotate one household duty through people and advance or skip the current turn.",
  pick: "One household job rotating through people, with current and next holders. Not a static group of people (People), many chores (Chores), staff shifts (Roster), or game turns (TurnOrder).",
  writeHints: [
    "at is a zero-based index smaller than people.length. The next people and next index are computed.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  partTiers: { next: "people", skip: "people" },
  realPath: "A rotation stays on the device; everyone viewing it on their own phone needs a shared app.",
  items: { key: "people", parts: ["root", "name", "photo"] },
  parts: ["root", "job", "next", "skip"],
  states: ["filled"],
  actions: { parts: { next: ["press"], skip: ["press"] } },
  read: (input, state) => {
    if (state !== "filled") return [];
    const { people, at } = input as z.output<typeof props>;
    return [people[at]!.name, turnLabels.next, turnLabels.skip];
  },
} as const satisfies Meta;
export const props = z
  .strictObject({
    job: text(24),
    people: z
      .array(z.strictObject({ name: text(16), photo: photo.optional() }))
      .min(2)
      .max(6),
    at: z.int().min(0).max(5),
  })
  .refine(({ people, at }) => at < people.length, { path: ["at"], message: "at must index people" });
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast),
    items = itemsOf(cast, 6);
  const people = items.map((item, index) => ({ name: titleOf(item, 16, thing) ?? placeholderTitle(index) }));
  while (people.length < 2) people.push({ name: placeholderTitle(people.length) });
  return { job: placeholderTitle(0), people, at: 0 };
}
export const examples = [
  {
    job: "Mist the plants",
    people: [{ name: "Sam", photo: "lib:people" }, { name: "Alex", photo: "lib:people" }, { name: "Mia" }],
    at: 0,
  },
  {
    job: "Walk Clover",
    people: [
      { name: "Alex", photo: "lib:people" },
      { name: "Sam", photo: "lib:people" },
    ],
    at: 1,
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Turns");
export const probes = [
  choose("Whose turn it is to wash dishes, followed by the next two people, with Done next and Skip"),
  choose("Show the household's people as a static stack of portraits, with no rotation", "People"),
  write("Mist the plants rotates through Sam, Alex and Mia in that order, Sam is current"),
  read("Finish Sam's turn and give the job to the next person", { address: "t1/next", action: "press" }),
] satisfies Probe[];
