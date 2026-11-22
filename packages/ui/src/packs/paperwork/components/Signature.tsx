import { z } from "zod";
import * as c from "../../../catalog";
import { attachment, privateFile, privateMark, seedFile, seedRows } from "../seeds";

// Core first: Field/toggle captures a yes or no, not a hand-drawn mark bound to a reviewed document.
export const meta = {
  id: "Signature",
  status: "draft",
  group: "input",
  purpose: "Draw a personal signature and save a dated copy of the reviewed form.",
  pick: "Draw a handwritten mark on a personal administrative form and save a dated local copy. Not a yes/no field (Field), typed client waiver acceptance (Agreement) or just viewing a file (Documents).",
  writeHints: [
    "document must be an opaque local:<id> or supplied synthetic lib:<id>. Do not write strokes, marks, version, timestamp, review or saved state; those belong to the host.",
    "Never claim verified identity, legal validity or remote signing. Omit hint unless supplied or useful.",
  ],
  region: "body",
  weight: 3,
  tier: "phone",
  realPath:
    "Touch or stylus input saves a dated local signed copy of the reviewed version without altering the original or verifying identity.",
  parts: [
    "root",
    "title",
    "signer",
    "hint",
    "document",
    "review",
    "pad",
    "clear",
    "save",
    "success",
    "error",
  ],
  states: ["empty", "filled", "loading", "success", "error"],
  confirmParts: ["clear"],
  emptyActions: ["document.press", "review.check", "pad.set"],
  actions: {
    parts: { document: ["press"], review: ["check"], pad: ["set"], clear: ["press"], save: ["press"] },
    // These gates are projected by the drawing host, never supplied by a Writer.
    when: {
      review: { can_review: true },
      pad: { can_draw: true },
      clear: { has_mark: true },
      save: { can_save: true },
    },
  },
  read: (input) => [privateFile, ...((input as { has_mark?: boolean }).has_mark ? [privateMark] : [])],
} as const satisfies c.Meta;

export const props = z.strictObject({
  title: c.text(32),
  document: attachment,
  signer: c.text(28),
  hint: c.text(60).optional(),
  style: z.enum(["pad"]).default("pad"),
});

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const { title, detail } = seedRows(input, 32, 28)[0]!;
  return { title, signer: detail, document: seedFile };
}

export const examples = [
  {
    title: "Allotment access form",
    document: "lib:ledge_access",
    signer: "Mina",
    hint: "Review the access rules first.",
  },
  {
    title: "Trot office access form",
    document: "lib:trot_access",
    signer: "Alex",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Signature");
export const probes = [
  choose(
    "Let me read my personal office access form, draw my signature with my finger, and keep a signed copy on this phone.",
  ),
  choose("Put a single yes or no switch on my form, labelled Use side entrance.", "Field"),
  write(
    "Let Mina draw her signature after reviewing the Allotment access form, supplied as synthetic attachment lib:ledge_access. Hint: Review the access rules first.",
  ),
  read(
    "Use the document preview action, not the signature pad, to open Mina's original allotment access form.",
    {
      address: "s1/document",
      action: "press",
    },
  ),
] satisfies c.Probe[];
