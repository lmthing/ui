import { z } from "zod";
import { probesFor, variantProps, type FallbackInput, type Meta, type Probe } from "../../../catalog";

// Core first: Amount/default cannot edit either side of a conversion or swap the currency pair.
export const meta = {
  id: "Converter",
  status: "draft",
  group: "input",
  purpose: "Convert between home and local currencies by entering either amount.",
  pick: "Convert two editable amounts between home and destination currencies with a swap control. Not displaying one sum (Amount) or entering an expense (AmountPad).",
  writeHints: [
    "Only write an optional starting numeric value. The brief supplies both currencies and a service supplies the rate and its date.",
  ],
  region: "body",
  weight: 2,
  tier: "service",
  realPath: "A rates service supplies exchange rates, cached on the device for offline use.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"] },
  parts: ["root", "from", "to", "swap", "rate_date"],
  states: ["filled", "loading"],
  actions: { parts: { from: ["type"], to: ["type"], swap: ["press"] } },
} as const satisfies Meta;

export const props = z.strictObject({
  ...variantProps(meta.variants),
  value: z.number().min(0).max(999999999).optional(),
});

export function fallback(_input: FallbackInput): z.input<typeof props> {
  return {};
}

export const examples = [
  { value: 25 },
  { value: 12000, density: "compact", surface: "plain" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Converter");
export const probes = [
  choose(
    "Let me type either the yen or the amount in my home currency, see the other amount update, and swap the two",
  ),
  choose(
    "Display the total hotel charge as one formatted read-only money amount, not a conversion",
    "Amount",
  ),
  write("Convert between the home and destination currencies, starting with an amount of 120."),
  read("Swap the two currencies", { address: "c1/swap", action: "press" }),
] satisfies Probe[];
