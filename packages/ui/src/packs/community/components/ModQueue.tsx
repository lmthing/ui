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
import { dateTime, distinct, ref } from "../seeds";

// Core first: List/expand opens notices but cannot record rule-backed moderation decisions.
export const meta = {
  id: "ModQueue",
  status: "draft",
  group: "action",
  tier: "people",
  pick: "Review membership applications or flagged posts and comments, then record a moderation decision and rule reason. Not expandable notices (List), a member register (Members), repair tickets (RequestTriage) or job candidates (ApplicantPipeline).",
  purpose: "Review join requests and flagged content under community rules.",
  region: "body",
  weight: 3,
  realPath:
    "pending applications, flagged content and moderator decisions synced in a shared community app (people).",
  dense: true,
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["detail"] } },
  parts: ["root"],
  items: { key: "items", parts: ["root", "detail", "approve", "decline", "remove", "reason"] },
  actions: {
    items: {
      root: ["press"],
      approve: ["press"],
      decline: ["press"],
      remove: ["press"],
      reason: ["select"],
    },
  },
  confirmParts: ["decline", "remove"],
  states: ["filled", "empty", "loading", "success", "error"],
} as const satisfies Meta;
export const props = z
  .strictObject({
    items: z
      .array(
        z.strictObject({
          id: ref,
          kind: z.enum(["join", "flagged_post", "flagged_comment"]),
          author: text(24),
          photo: photo.optional(),
          summary: text(120),
          detail: text(200).optional(),
          reason: text(32).optional(),
          submittedAt: dateTime,
          status: z.enum(["pending", "approved", "declined", "removed"]),
          goto: screenId.optional(),
        }),
      )
      .min(0)
      .max(12),
    rules: z.array(text(32)).min(1).max(6),
    style: z.enum(["all", "joins"]).default("all"),
  })
  .refine(({ items }) => distinct(items, (row) => row.id), { path: ["items"] })
  .refine(({ rules }) => distinct(rules, (rule) => rule), { path: ["rules"] });

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 1);
  function castTitle(max: number, index: number) {
    const item = items[index];
    return (item && titleOf(item, max, thing)) || clip(placeholderTitle(index, lang), max);
  }
  return {
    items: Array.from({ length: 0 }, (_, index) => ({
      id: castTitle(24, index),
      kind: "join",
      author: castTitle(24, index),
      summary: castTitle(120, index),
      submittedAt: "2000-01-01T00:00:00Z",
      status: "pending",
    })),
    rules: Array.from({ length: 1 }, (_, index) => castTitle(32, index)),
  };
}

// TODO: Replace the neutral seed with two real examples covering styles and optional fields.
export const examples = [fallback({ cast: { things: [], items: [] } })] satisfies z.input<typeof props>[];

// TODO: Replace the probe prompts and verify the fixture address and any action gates.
const { choose, write, read } = probesFor("ModQueue");
export const probes = [
  choose("TODO: describe the need this component should win"),
  choose("Let people open short notices to read the full text, with no moderation or decisions.", "List"),
  write("TODO: describe realistic values and intent in the person’s words"),
  read("TODO: ask for this action in the person’s words", { address: "c1/r1", action: "press" }),
] satisfies Probe[];

export function ModQueue(_input: Props<typeof props, typeof meta>) {
  return null;
}
