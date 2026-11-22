import { z } from "zod";
import * as c from "../../../catalog";
import { attachment, seedFile, seedRows } from "../seeds";

// Core first: Field/text edits one generic value, not a document-bound set of named fields and a local copy.
export const meta = {
  id: "FormFiller",
  status: "draft",
  group: "input",
  purpose: "Complete a personal form and keep a local copy of the filled document.",
  pick: "Fill named fields tied to a personal PDF or administrative template, check completeness and save a separate local copy. Not standalone input (Field), drawing a signature (Signature), or a client agreement (Agreement).",
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "The device previews the original and saves a separate local copy with the entered values.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["root", "label", "hint", "field", "check"] } },
  parts: ["root", "title", "label", "amount", "preview", "save", "clear", "status"],
  items: { key: "fields", parts: ["root", "label", "hint", "field", "check"] },
  actions: {
    parts: { preview: ["press"], save: ["press"], clear: ["press"] },
    items: { field: ["type"], check: ["check"] },
  },
  confirmParts: ["clear"],
  states: ["empty", "filled", "loading", "success", "error"],
} as const satisfies c.Meta;

const namedField = z.strictObject({
  label: c.text(28),
  kind: z.enum(["text", "date", "number", "check"]),
  value: z
    .union([c.text(80), z.boolean()])
    .meta({ read: false })
    .optional(),
  required: z.boolean().default(false),
});

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  title: c.text(32),
  document: attachment,
  fields: z.array(namedField).min(1).max(16),
});

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const { title, detail } = seedRows(input, 32, 28)[0]!;
  return { title, document: seedFile, fields: [{ label: detail, kind: "text" }] };
}

export const examples = [
  {
    title: "Allotment access form",
    document: "lib:ledge_access",
    fields: [
      { label: "Applicant name", kind: "text", required: true, value: "Mina Shaw" },
      { label: "Access start date", kind: "date", required: true },
      { label: "Plot number", kind: "number", value: "12" },
      { label: "I accept the access rules", kind: "check", required: true, value: false },
    ],
  },
  {
    title: "Trot office access form",
    document: "lib:trot_access",
    detail: "brief",
    fields: [
      { label: "Applicant name", kind: "text", required: true, value: "Alex Reed" },
      { label: "Access start date", kind: "date", required: true, value: "2026-11-24" },
      { label: "Badge count", kind: "number", value: "2" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("FormFiller");
export const probes = [
  choose(
    "Fill out my local allotment permit PDF using its named fields and save a separate filled copy without changing the template.",
  ),
  choose(
    "Put one standalone text box labelled Applicant name on this screen. No PDF, other fields, progress or export.",
    "Field",
  ),
  write(
    "Create Allotment access form uses supplied template lib:ledge_access. Required fields: Applicant name (text) and Access start date (date). Optional Plot number (number) starts at 12. Add a required unchecked box I accept the access rules.",
  ),
  {
    ...write(
      "Fill the Allotment access form from lib:ledge_access. Keep Applicant name (required text) and Plot number (optional number) in the data. Show only required fields without changing spacing or card finish.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Tick I accept the access rules. Leave the other inputs untouched.", {
    address: "f1/r4/check",
    action: "check",
  }),
] satisfies c.Probe[];
