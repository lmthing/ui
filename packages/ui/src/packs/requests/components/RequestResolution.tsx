import { z } from "zod";
import * as c from "../../../catalog";

const outcomes = ["repaired", "workaround", "unable", "duplicate"] as const;

// Core first: Success/screen cannot verify repair evidence or reopen the original request.
export const meta = {
  id: "RequestResolution",
  status: "draft",
  group: "action",
  purpose: "Verify a repair outcome, accept it or reopen the original request.",
  pick: "Propose, verify, accept or reopen a service ticket outcome with evidence and checks after linked work. Not a success message (Success), a star rating (Scale), or accepting contract terms (Agreement).",
  writeHints: [
    "unable and duplicate require a reason; duplicateOf is required only for duplicate. Reopening also needs a reason at action time.",
    "Use review for a proposed outcome and receipt for the saved outcome. The host gates actions on roles and linked work; never write completion or acceptance flags.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  partTiers: { accept: "people", reopen: "people" },
  confirmParts: ["resolve"],
  realPath: "A resolution is saved on the operator's device; acceptance and reopening need a shared app.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: [
    "root",
    "number",
    "outcome",
    "summary",
    "duplicate_of",
    "photos",
    "resolve",
    "accept",
    "reason",
    "reopen",
  ],
  items: { key: "checks", parts: ["root", "text", "check"] },
  states: ["filled", "loading", "success", "error"],
  actions: {
    parts: {
      outcome: ["select"],
      resolve: ["press"],
      accept: ["press"],
      reason: ["type"],
      reopen: ["press"],
    },
    items: { check: ["check"] },
    when: {
      outcome: { style: "review" },
      resolve: { style: "review" },
      accept: { style: "receipt", verified: true },
      reopen: { style: "receipt", canReopen: true },
    },
  },
  successActions: ["reason.type", "reopen.press"],
  selections: { outcome: { prop: "outcome", choices: { prop: "outcome_choices" } } },
  read: (input): string[] => {
    const { outcome, duplicateOf, checks } = input as z.output<typeof props>;
    return [
      duplicateOf ? `${outcome} → ${duplicateOf}` : outcome,
      ...checks.map(({ done }, index) => `r${index + 1} ${done ? "done" : "todo"}`),
    ];
  },
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    number: c.text(12),
    outcome: z.enum(outcomes).default("repaired"),
    summary: c.text(120),
    duplicateOf: c.text(12).optional(),
    checks: z
      .array(z.strictObject({ text: c.text(36), done: z.boolean() }))
      .min(1)
      .max(6),
    photos: z.array(c.photo).min(0).max(4),
    reason: c.text(120).optional(),
    style: z.enum(["review", "receipt"]).default("review"),
  })
  .refine(
    ({ outcome, duplicateOf, number }) =>
      outcome === "duplicate" ? Boolean(duplicateOf && duplicateOf !== number) : duplicateOf === undefined,
    { path: ["duplicateOf"] },
  )
  .refine(({ outcome, reason }) => !["unable", "duplicate"].includes(outcome) || Boolean(reason), {
    path: ["reason"],
  })
  .overwrite((value) => ({
    ...value,
    reason: value.reason ?? "",
    canReopen: Boolean(value.reason),
    outcome_choices:
      value.outcome === "duplicate"
        ? ["duplicate"]
        : ["repaired", "workaround", ...(value.reason ? ["unable"] : [])],
    verified: value.checks.every(({ done }) => done),
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast),
    item = c.itemsOf(cast, 1)[0];
  return {
    number: c.placeholderValue,
    summary: (item && c.detailOf(item, 120, thing)) || c.wordsFor(lang).placeholderDetail,
    checks: [{ text: (item && c.titleOf(item, 36, thing)) || c.placeholderTitle(0, lang), done: false }],
    photos: [],
  };
}

// prettier-ignore
export const examples = [
  { number: "LG-41", summary: "Replaced the grow light and checked its timer.", checks: [{ text: "Timer switches the light off", done: true }], photos: ["local:2"] },
  { number: "TR-08", outcome: "duplicate", duplicateOf: "TR-07", summary: "The existing request covers this gate.", checks: [{ text: "Confirmed it is the same latch", done: true }], photos: [], reason: "Both reports cover the dog run gate.", style: "receipt", density: "compact", surface: "outlined" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("RequestResolution");
export const probes = [
  choose(
    "Let us propose a fix with evidence and verification checks, then let the requester accept it or reopen the same ticket if it failed",
  ),
  choose(
    "Show a simple confirmation screen that says the report was sent successfully, with no further decisions",
    "Success",
  ),
  write(
    "Propose a repaired outcome for LG-41: Replaced the grow light and checked its timer. Verify Timer switches the light off, checked. Evidence is local:2.",
  ),
  read("Save the proposed fix for the grow light", { address: "r1/resolve", action: "press" }),
  read("Accept the saved outcome for TR-08", { address: "r1/accept", action: "press" }, 1),
] satisfies c.Probe[];
