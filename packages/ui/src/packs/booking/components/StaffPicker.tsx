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

// Core first: People/stack shows participants, not a booking provider choice with Anyone.
export const meta = {
  id: "StaffPicker",
  status: "draft",
  group: "input",
  purpose: "Choose who provides the booked service, or leave it to anyone.",
  pick: "Select a service provider for a booking, including Anyone. Not participants or people shown without selecting a provider (People).",
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "Each staff member has working hours and bookings in a shared app.",
  items: { key: "staff", parts: ["root", "name", "photo", "role"] },
  parts: ["root", "anyone"],
  states: ["filled", "loading"],
  actions: { items: { root: ["select"] }, parts: { anyone: ["select"] }, when: { anyone: { anyone: true } } },
} as const satisfies Meta;
export const props = z
  .strictObject({
    staff: z
      .array(z.strictObject({ name: text(20), photo, role: text(20).optional() }))
      .min(1)
      .max(6),
    anyone: z.boolean().default(true),
    at: z.int().min(0).max(6).optional(),
  })
  .refine(({ staff, at, anyone }) => at === undefined || (at === 0 ? anyone : at <= staff.length), {
    path: ["at"],
  });
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const staff = itemsOf(cast, 3).map((item) => ({
    name: titleOf(item, 20, thing) || placeholderTitle(0),
    photo: "local:1",
  }));
  return { staff: staff.length ? staff : [{ name: placeholderTitle(0), photo: "local:1" }] };
}
export const examples = [
  { staff: [{ name: "Anna", photo: "lib:people", role: "Plant care" }], anyone: true, at: 0 },
  {
    staff: [
      { name: "Sam", photo: "lib:people", role: "Walker" },
      { name: "Alex", photo: "lib:people" },
    ],
    anyone: false,
    at: 1,
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("StaffPicker");
export const probes = [
  choose("Choose which staff member does my booked service, or let anyone available do it"),
  choose("Show the people coming on my walk as overlapping avatars", "People"),
  write("Choose between walkers Sam and Alex, allow anyone, select Sam"),
  read("Choose Anna for this booking", { address: "s1/r1", action: "select" }),
] satisfies Probe[];
