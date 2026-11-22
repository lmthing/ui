import { z } from "zod";
import {
  clip,
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

// Core first: Timer[until] counts down to one instant but cannot track two contractual targets or record a breach.
export const meta = {
  id: "SlaPolicy",
  status: "draft",
  group: "data",
  tier: "phone",
  pick: "tracking contractual response and resolution SLA targets on one active request. Not a generic countdown (Timer[until]), a full operational queue (RequestQueue), or static policy facts (KeyValue).",
  purpose: "Track contractual first-response and resolution deadlines for a request.",
  region: "body",
  weight: 2,
  realPath:
    "contractual SLA deadlines computed locally by the host from the request's policy tier and event timestamps, or synced from a shared service desk.",
  parts: ["root", "policy"],
  actions: { parts: { policy: ["press"] } },
  states: ["filled", "loading", "success", "error"],
} as const satisfies Meta;
export const props = z.strictObject({
  requestRef: text(32),
  tier: text(24),
  openedAt: z.iso.datetime({ offset: true }),
  responseDueAt: z.iso.datetime({ offset: true }),
  respondedAt: z.iso.datetime({ offset: true }).optional(),
  resolutionDueAt: z.iso.datetime({ offset: true }),
  resolvedAt: z.iso.datetime({ offset: true }).optional(),
  paused: z.boolean().default(false),
  policyGoto: screenId.optional(),
  style: z.enum(["card", "compact"]).default("card"),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 1);
  function castTitle(max: number, index: number) {
    const item = items[index];
    return (item && titleOf(item, max, thing)) || clip(placeholderTitle(index, lang), max);
  }
  return {
    requestRef: castTitle(32, 0),
    tier: castTitle(24, 0),
    openedAt: "2000-01-01T00:00:00Z",
    responseDueAt: "2000-01-01T00:00:00Z",
    resolutionDueAt: "2000-01-01T00:00:00Z",
  };
}

// TODO: Replace the neutral seed with two real examples covering styles and optional fields.
export const examples = [fallback({ cast: { things: [], items: [] } })] satisfies z.input<typeof props>[];

// TODO: Replace the probe prompts and verify the fixture address and any action gates.
const { choose, write, read } = probesFor("SlaPolicy");
export const probes = [
  choose("TODO: describe the need this component should win"),
  choose("TODO: describe the nearest wrong choice", "RequestQueue"),
  write("TODO: describe realistic values and intent in the person’s words"),
  read("TODO: ask for this action in the person’s words", { address: "c1/policy", action: "press" }),
] satisfies Probe[];

export function SlaPolicy(_input: Props<typeof props, typeof meta>) {
  return null;
}
