import { z } from "zod";
import * as c from "../../../catalog";
import { attachment, seedRows } from "../seeds";

// Core first: Camera/scan captures a page but cannot stage, reorder, retake and assemble a batch.
export const meta = {
  id: "ScanBatch",
  status: "draft",
  group: "input",
  purpose: "Arrange scanned pages and save them as one local PDF.",
  pick: "Stage multiple scanned pages, reorder or replace pages and assemble one local PDF. Not a single capture (Camera), browsing photos (Gallery), or opening a saved document (Documents).",
  region: "body",
  weight: 3,
  dense: true,
  tier: "ok",
  realPath: "The device scanner captures pages with permission and saves an ordered PDF locally.",
  parts: ["root", "title", "count", "add", "save", "status"],
  items: { key: "pages", parts: ["root", "photo", "label", "retake", "remove"] },
  actions: {
    parts: { add: ["scan"], save: ["press"] },
    items: { root: ["move"], retake: ["scan"], remove: ["press"] },
  },
  confirmParts: ["remove"],
  states: ["empty", "filled", "loading", "success", "error"],
} as const satisfies c.Meta;

export const props = z.strictObject({
  title: c.text(32).optional(),
  pages: z
    .array(z.strictObject({ file: attachment, label: c.text(16).optional() }))
    .min(0)
    .max(24),
  captureGoto: c.screenId.optional(),
  style: z.enum(["tray", "review"]).default("tray"),
});

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return { title: seedRows(input, 32, 16)[0]!.title, pages: [] };
}

export const examples = [
  {
    title: "Allotment rules",
    pages: [
      { file: "lib:ledge_rules", label: "Access rules" },
      { file: "lib:ledge_map", label: "Plot map" },
    ],
  },
  {
    title: "Trot permit packet",
    style: "review",
    pages: [
      { file: "lib:trot_permit", label: "Permit" },
      { file: "lib:trot_cover", label: "Cover sheet" },
    ],
    captureGoto: "vault_capture",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("ScanBatch");
export const probes = [
  choose(
    "Let me reorder, retake or remove individual pages across several scans before I save them as one PDF on this phone.",
  ),
  choose(
    "Point my phone at one permit and scan it now. Just take one scan; no page tray or PDF assembly.",
    "Camera",
  ),
  write(
    "Make an Allotment rules scan batch from two supplied page images: Access rules lib:ledge_rules, then Plot map lib:ledge_map.",
  ),
  read("Remove the first page, Access rules, from this scan batch.", {
    address: "s1/r1/remove",
    action: "press",
  }),
] satisfies c.Probe[];
