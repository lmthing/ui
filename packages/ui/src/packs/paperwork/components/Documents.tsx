import { z } from "zod";
import * as c from "../../../catalog";
import { attachment, privateFile, seedRows } from "../seeds";

// Core first: List/default opens ordinary rows, but cannot file private records with masked numbers and expiry.
export const meta = {
  id: "Documents",
  status: "draft",
  group: "data",
  purpose: "Keep private records together and see when they expire.",
  pick: "A private life-admin file register with owners, identifiers and expiry dates. Not ordinary links (List), documents checked against a trip (TravelDocs), purchase warranties (Warranties) or rental terms (Lease).",
  writeHints: [
    "Never invent a document number or expiry warning. Copy dates only if known. File is an opaque local:<id> or supplied synthetic lib:<id>, never a URL or file content.",
    'Use style "cards" only for separate file-type tiles, never readable previews; otherwise write style:null. A plain background with no enclosing card requests surface:"plain". Without an explicit spacing change, always write JSON density:null, never "comfortable", even when a plain surface is requested. Write surface:null if no surface is requested.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "Records and attachments stay on device, with a local file viewer and identifiers masked and read as (secret).",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"] },
  parts: ["root", "empty", "error"],
  items: {
    key: "docs",
    parts: [
      "root",
      "title",
      "kind",
      "owner",
      "issuer",
      "number",
      "issued",
      "expires",
      "file",
      "tags",
      "warning",
      "remove",
    ],
  },
  confirmParts: ["remove"],
  states: ["filled", "empty", "loading", "error"],
  actions: {
    items: { root: ["press"], remove: ["press"] },
    when: { root: { can_open: true } },
    noGoto: { items: ["remove"] },
  },
  read: (input): string[] =>
    (input as z.output<typeof props>).docs.flatMap(({ issued, expires, file }) =>
      [issued, expires, file && privateFile].filter((line): line is string => Boolean(line)),
    ),
} as const satisfies c.Meta;

const doc = z
  .strictObject({
    title: c.text(32),
    kind: z.enum(["id", "insurance", "certificate", "tax", "contract", "form", "other"]),
    owner: c.text(24),
    issuer: c.text(24).optional(),
    number: c.secret(32).optional(),
    issued: c.isoDate.optional(),
    expires: c.isoDate.optional(),
    file: attachment.optional(),
    tags: z.array(c.text(16)).min(0).max(3),
    goto: c.screenId.optional(),
  })
  .overwrite((row) => ({ ...row, can_open: Boolean(row.file || row.goto) }));

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  docs: z.array(doc).min(1).max(6),
  style: z.enum(["cards"]).optional(),
});

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    docs: seedRows(input, 32, 24).map(({ title, detail }) => ({
      title,
      owner: detail,
      kind: "other",
      tags: [],
    })),
  };
}

export const examples = [
  {
    docs: [
      {
        title: "Ledge greenhouse permit",
        kind: "certificate",
        owner: "Mina",
        issuer: "Garden office",
        number: "DEMO-A",
        issued: "2026-04-10",
        expires: "2027-04-10",
        file: "lib:greenhouse_permit",
        tags: ["permits"],
        goto: "permit",
      },
    ],
  },
  {
    style: "cards",
    density: "compact",
    surface: "plain",
    docs: [
      {
        title: "Trot liability policy",
        kind: "insurance",
        owner: "Alex",
        expires: "2027-02-01",
        file: "lib:trot_policy",
        tags: ["insurance"],
      },
      { title: "First aid certificate", kind: "certificate", owner: "Alex", file: "lib:trot_aid", tags: [] },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Documents");
export const probes = [
  choose(
    "File my IDs and certificates with their owners, masked identification numbers, private scans and expiry warnings.",
  ),
  choose("Give me a plain list of three named links I can tap to open, with a chevron on each.", "List"),
  write(
    "File Mina's greenhouse permit as a certificate from Garden office, expires 2027-04-10, with the supplied synthetic attachment lib:greenhouse_permit and the permits tag.",
  ),
  {
    ...write(
      "File Mina's greenhouse permit, a certificate expiring 2027-04-10 with tag permits. Give the register a plain background with the rows directly on the screen and no enclosing card.",
    ),
    variant: { axis: "surface", value: "plain" },
  },
  read("Open Mina's greenhouse permit.", { address: "d1/r1", action: "press" }),
] satisfies c.Probe[];
