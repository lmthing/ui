import { z } from "zod";
import {
  clip,
  isoDate,
  itemsOf,
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

// Core first: KeyValue[rows] shows owner and dates but cannot frame a charter with pinned prose and independently actionable resources.
export const meta = {
  id: "ProjectBrief",
  status: "draft",
  group: "content",
  tier: "phone",
  pick: "framing a project's goal, owner, window, and key reference links. Not testable deliverable acceptance (Scope), flat facts (KeyValue), or long-form reading (media Article).",
  purpose:
    "A project charter card framing the objective, owner, delivery window, pinned sections and resource links.",
  region: "body",
  weight: 2,
  realPath:
    "project charter and local links stored on the device; external URL links open via the device's browser (service).",
  parts: ["root", "edit"],
  items: { key: "links", parts: ["root", "open"] },
  actions: { parts: { edit: ["press"] }, items: { root: ["press"], open: ["press"] } },
  partTiers: { open: "service" },
  states: ["filled", "empty", "loading"],
} as const satisfies Meta;
export const props = z.strictObject({
  projectRef: text(32),
  title: text(40),
  objective: text(240),
  owner: text(24).optional(),
  start: isoDate.optional(),
  target: isoDate.optional(),
  sections: z
    .array(z.strictObject({ heading: text(24), body: text(160) }))
    .min(0)
    .max(3),
  links: z
    .array(z.strictObject({ label: text(28), kind: z.enum(["screen", "file", "url"]), goto: text(120) }))
    .min(0)
    .max(5),
  editGoto: screenId.optional(),
  style: z.enum(["overview", "summary"]).default("overview"),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 1);
  function castTitle(max: number, index: number) {
    const item = items[index];
    return (item && titleOf(item, max, thing)) || clip(placeholderTitle(index, lang), max);
  }
  return {
    projectRef: castTitle(32, 0),
    title: castTitle(40, 0),
    objective: castTitle(240, 0),
    sections: Array.from({ length: 0 }, (_, index) => ({
      heading: castTitle(24, index),
      body: castTitle(160, index),
    })),
    links: Array.from({ length: 0 }, (_, index) => ({
      label: castTitle(28, index),
      kind: "screen",
      goto: castTitle(120, index),
    })),
  };
}

// TODO: Replace the neutral seed with two real examples covering styles and optional fields.
export const examples = [fallback({ cast: { things: [], items: [] } })] satisfies z.input<typeof props>[];

// TODO: Replace the probe prompts and verify the fixture address and any action gates.
const { choose, write, read } = probesFor("ProjectBrief");
export const probes = [
  choose("TODO: describe the need this component should win"),
  choose("Show only plain labelled facts for one project: owner, office and reference number.", "KeyValue"),
  write("TODO: describe realistic values and intent in the person’s words"),
  read("TODO: ask for this action in the person’s words", { address: "c1/edit", action: "press" }),
] satisfies Probe[];

export function ProjectBrief(_input: Props<typeof props, typeof meta>) {
  return null;
}
