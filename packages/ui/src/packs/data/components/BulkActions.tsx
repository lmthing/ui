import { z } from "zod";
import {
  icon,
  placeholderTitle,
  probesFor,
  text,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: Actions/default offers shortcuts, not commands tied to a checked set of records.
export const meta = {
  id: "BulkActions",
  status: "draft",
  group: "action",
  purpose: "Apply an action to the checked records together.",
  pick: "Apply a command to checked records together, with a selected count and Select all. Not standalone shortcuts (Actions) or a single primary action (Button).",
  writeHints: [
    "Write only the actions, 2 to 4. Set danger true for destructive actions such as deleting checked records. The count is derived from checked rows; never write it.",
  ],
  region: "bottom",
  weight: 2,
  tier: "phone",
  realPath: "The action applied to the selected records on the device.",
  variants: { density: ["comfortable", "compact"] },
  parts: ["root", "count", "all"],
  items: { key: "items", parts: ["root", "label", "icon", "confirm"] },
  states: ["filled", "empty"],
  // Confirmation metadata addresses static part names, so dangerous rows use their confirm part.
  confirmParts: ["confirm"],
  actions: {
    parts: { all: ["press"] },
    items: { root: ["press"], confirm: ["press"] },
    when: { root: { danger: false }, confirm: { danger: true } },
  },
} as const satisfies Meta;

export const props = z.strictObject({
  ...variantProps(meta.variants),
  items: z
    .array(z.strictObject({ icon, label: text(14), danger: z.boolean() }))
    .min(2)
    .max(4),
});

export function fallback({ lang }: FallbackInput): z.input<typeof props> {
  return {
    items: [
      { icon: "check", label: placeholderTitle(0, lang), danger: false },
      { icon: "check", label: placeholderTitle(1, lang), danger: false },
    ],
  };
}

export const examples = [
  {
    items: [
      { icon: "check", label: "Mark watered", danger: false },
      { icon: "close", label: "Delete plants", danger: true },
    ],
  },
  {
    density: "compact",
    items: [
      { icon: "check", label: "Mark reviewed", danger: false },
      { icon: "share", label: "Export walks", danger: false },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("BulkActions");
export const probes = [
  choose(
    "After I tick several record rows, show the selected count, select all, and let me apply one archive, tag or delete command to the marked rows.",
  ),
  choose(
    "Give me three independent shortcuts for calling, sharing and finding directions. They do not act on selected records.",
    "Actions",
  ),
  write(
    "For checked plant records, offer Mark watered with a check icon and Delete plants with a close icon. Only deleting is dangerous.",
  ),
  read("Start deleting the checked plants, which asks for confirmation.", {
    address: "s1/r2/confirm",
    action: "press",
  }),
] satisfies Probe[];
