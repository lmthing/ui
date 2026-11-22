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

// Core first: Banner/tone warns briefly, but cannot show a full authored staff bulletin and record read receipts.
export const meta = {
  id: "TeamNotice",
  status: "draft",
  group: "content",
  tier: "people",
  pick: "official workplace announcements or safety bulletins requiring read confirmation. Not shift-to-shift handovers (Handover), ephemeral status banners (Banner), or social posts (social Post).",
  purpose:
    "A pinned workplace announcement or safety and policy bulletin displaying its title, author, timestamp, priority tone.",
  region: "body",
  weight: 2,
  realPath: "pinned workplace bulletins and per-employee read receipts synchronized in a shared team app.",
  parts: ["root", "ack"],
  actions: { parts: { ack: ["check"], root: ["press"] } },
  states: ["filled", "loading", "success"],
} as const satisfies Meta;
export const props = z.strictObject({
  title: text(48),
  by: text(24),
  postedAt: text(16),
  priority: z.enum(["info", "important", "urgent"]).default("info"),
  body: text(400),
  requireAck: z.boolean().default(true),
  acknowledged: z.boolean().default(false),
  readCount: z.int().min(0),
  totalMembers: z.int().min(1),
  goto: screenId.optional(),
  style: z.enum(["bulletin", "pinned"]).default("bulletin"),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 1);
  function castTitle(max: number, index: number) {
    const item = items[index];
    return (item && titleOf(item, max, thing)) || clip(placeholderTitle(index, lang), max);
  }
  return {
    title: castTitle(48, 0),
    by: castTitle(24, 0),
    postedAt: castTitle(16, 0),
    body: castTitle(400, 0),
    readCount: 0,
    totalMembers: 1,
  };
}

// TODO: Replace the neutral seed with two real examples covering styles and optional fields.
export const examples = [fallback({ cast: { things: [], items: [] } })] satisfies z.input<typeof props>[];

// TODO: Replace the probe prompts and verify the fixture address and any action gates.
const { choose, write, read } = probesFor("TeamNotice");
export const probes = [
  choose("TODO: describe the need this component should win"),
  choose("TODO: describe the nearest wrong choice", "Handover"),
  write("TODO: describe realistic values and intent in the person’s words"),
  read("TODO: ask for this action in the person’s words", { address: "c1/ack", action: "check" }),
] satisfies Probe[];

export function TeamNotice(_input: Props<typeof props, typeof meta>) {
  return null;
}
