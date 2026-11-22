import { z } from "zod";
import * as c from "../../../catalog";
import { prompt } from "../../../entry/prompt-CardControls.generated";

// Core first: List with toggle trails cannot manage a single issuer card's freeze, channel limits and protected details.
export const meta = {
  id: "CardControls",
  status: "draft",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "service",
  realPath: "The issuer applies card controls; revealing protected details requires host device unlock.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["spendCap", "reveal"] } },
  parts: [
    "root",
    "label",
    "network",
    "last4",
    "expires",
    "freeze",
    "online",
    "atm",
    "international",
    "spendCap",
    "reveal",
    "status",
  ],
  states: ["filled", "loading", "success", "error"],
  partTiers: { reveal: "ok" },
  confirmParts: ["freeze"],
  actions: {
    parts: {
      freeze: ["toggle"],
      online: ["toggle"],
      atm: ["toggle"],
      international: ["toggle"],
      spendCap: ["set"],
      reveal: ["press"],
    },
    when: { spendCap: { detail: "full", capped: true }, reveal: { detail: "full", protectedDetails: true } },
  },
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    cardRef: c.text(32),
    label: c.text(24),
    network: z.enum(["debit", "credit", "ebt", "prepaid"]),
    last4: c.text(4).regex(/^\d{4}$/),
    frozen: z.boolean().default(false),
    channels: z.strictObject({ online: z.boolean(), atm: z.boolean(), international: z.boolean() }),
    spendCap: z.number().nonnegative().optional(),
    maxCap: z.number().positive().optional(),
    maskedNumber: c.secret(24).optional(),
    cvv: c.secret(4).optional(),
    expires: c.text(7).optional(),
  })
  .refine(({ spendCap, maxCap }) => spendCap === undefined || (maxCap !== undefined && spendCap <= maxCap), {
    path: ["spendCap"],
    message: "A spend cap requires a maxCap at least as large",
  })
  .overwrite((input) => ({
    ...input,
    capped: input.spendCap !== undefined,
    protectedDetails: Boolean(input.maskedNumber || input.cvv),
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const item = c.itemsOf(cast, 1)[0];
  return {
    cardRef: "placeholder",
    label: (item && c.titleOf(item, 24, c.thingOf(cast))) || c.placeholderTitle(0, lang),
    network: "debit",
    last4: "0000",
    channels: { online: false, atm: false, international: false },
  };
}

export const examples = [
  {
    cardRef: "ledge-demo",
    label: "Ledge supplies card",
    network: "debit",
    last4: "4821",
    channels: { online: true, atm: false, international: false },
    spendCap: 95,
    maxCap: 250,
    expires: "08/29",
  },
  {
    cardRef: "trot-demo",
    label: "Trot walk kit card",
    network: "prepaid",
    last4: "9034",
    frozen: true,
    channels: { online: false, atm: false, international: true },
    detail: "brief",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("CardControls");
export const probes = [
  choose("Freeze my debit card, switch off overseas purchases and cap each purchase at 95."),
  choose(
    "Show ordinary settings as rows with individual on/off switches for weekly summaries and reminders.",
    "List",
  ),
  write(
    "My Ledge debit card is demo reference ledge-demo ending 4821. Allow online shopping only, with a cap of 95 and upper limit 250.",
  ),
  {
    ...write(
      "My Ledge debit card is demo reference ledge-demo ending 4821. Allow online shopping only. Show just the freeze and channel controls, without the spend slider or reveal.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Freeze the Ledge supplies card.", { address: "c1/freeze", action: "toggle" }),
] satisfies c.Probe[];
