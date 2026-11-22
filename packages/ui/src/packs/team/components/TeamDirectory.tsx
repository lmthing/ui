import { z } from "zod";
import {
  clip,
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
  type Props,
} from "../../../catalog";

// Core first: People/rows lists participants without a searchable department directory, reporting lines, or staff contact controls.
export const meta = {
  id: "TeamDirectory",
  status: "draft",
  group: "content",
  tier: "people",
  pick: "browsing workplace staff, departments, reporting lines, and live shift status. Not small task teams (People), business clients (customers ClientCard), or club registers (community Members).",
  purpose:
    "A searchable staff and org directory grouped by department, showing each member's avatar, name, role, reporting.",
  region: "body",
  weight: 3,
  realPath:
    "staff directory and live shift status synced from a shared workplace app; calling opens the device dialer or VoIP service (call).",
  dense: true,
  parts: ["root", "search"],
  items: { key: "members", parts: ["root", "message", "call"] },
  actions: { parts: { search: ["type"] }, items: { root: ["press"], message: ["press"], call: ["press"] } },
  partTiers: { call: "service" },
  states: ["filled", "empty", "loading"],
} as const satisfies Meta;
export const props = z.strictObject({
  departments: z.array(text(24)).min(0).max(6),
  members: z
    .array(
      z.strictObject({
        name: text(24),
        role: text(24),
        department: text(24).optional(),
        photo: photo.optional(),
        availability: z.enum(["on_shift", "break", "pto", "off"]),
        manager: text(24).optional(),
        goto: screenId.optional(),
      }),
    )
    .min(1)
    .max(16),
  query: text(32).optional(),
  style: z.enum(["grouped", "compact"]).default("grouped"),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 1);
  function castTitle(max: number, index: number) {
    const item = items[index];
    return (item && titleOf(item, max, thing)) || clip(placeholderTitle(index, lang), max);
  }
  return {
    departments: Array.from({ length: 0 }, (_, index) => castTitle(24, index)),
    members: Array.from({ length: 1 }, (_, index) => ({
      name: castTitle(24, index),
      role: castTitle(24, index),
      availability: "on_shift",
    })),
  };
}

// TODO: Replace the neutral seed with two real examples covering styles and optional fields.
export const examples = [fallback({ cast: { things: [], items: [] } })] satisfies z.input<typeof props>[];

// TODO: Replace the probe prompts and verify the fixture address and any action gates.
const { choose, write, read } = probesFor("TeamDirectory");
export const probes = [
  choose("TODO: describe the need this component should win"),
  choose("TODO: describe the nearest wrong choice", "People"),
  write("TODO: describe realistic values and intent in the person’s words"),
  read("TODO: ask for this action in the person’s words", { address: "c1/search", action: "type" }),
] satisfies Probe[];

export function TeamDirectory(_input: Props<typeof props, typeof meta>) {
  return null;
}
