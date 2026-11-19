import { z } from "zod";
import {
  itemsOf,
  placeholderTitle,
  probesFor,
  screenId,
  swatchNames,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: Amount/large cannot show separate account kinds, last digits and balances in a card rail.
export const meta = {
  id: "AccountCard",
  status: "draft",
  group: "content",
  purpose: "See each of your accounts and its balance at a glance.",
  pick: "Your separate accounts as cards, with kind, last digits and balance. Not one total (Amount), or a client's payment (PaymentStatus).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Balances typed in on the device; a bank link would need an outside service.",
  parts: ["root"],
  items: { key: "accounts", parts: ["root", "name", "kind", "last4", "balance"] },
  states: ["filled", "loading"],
  actions: { items: { root: ["press"] } },
} as const satisfies Meta;

export const props = z.strictObject({
  accounts: z
    .array(
      z.strictObject({
        name: text(20),
        kind: z.enum(["current", "savings", "card", "cash", "jar"]),
        last4: text(4)
          .regex(/^\d{4}$/)
          .optional(),
        balance: z.number(),
        swatch: z.enum(swatchNames),
        goto: screenId,
      }),
    )
    .min(1)
    .max(4),
});

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const accounts = itemsOf(cast, 3).map((item, index) => ({
    name: titleOf(item, 20, thing) || placeholderTitle(index),
    kind: "cash" as const,
    balance: 0,
    swatch: "grey" as const,
    goto: "details",
  }));
  return {
    accounts: accounts.length
      ? accounts
      : [
          {
            name: placeholderTitle(0),
            kind: "cash",
            balance: 0,
            swatch: "grey",
            goto: "details",
          },
        ],
  };
}

export const examples = [
  {
    accounts: [
      { name: "Ledge supplies", kind: "jar", balance: 84, swatch: "green", goto: "supplies" },
      {
        name: "Everyday account",
        kind: "current",
        last4: "4821",
        balance: 1240.5,
        swatch: "navy",
        goto: "current",
      },
    ],
  },
  {
    accounts: [
      { name: "Trot rainy-day fund", kind: "savings", balance: 640, swatch: "blue", goto: "savings" },
      { name: "Walk kit card", kind: "card", last4: "9034", balance: -120, swatch: "purple", goto: "card" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("AccountCard");
export const probes = [
  choose(
    "Show my current account, savings and credit card as separate coloured cards with each balance and last four digits",
  ),
  choose("Show my total savings as one large sum, not separate accounts", "Amount"),
  write(
    "Two accounts: Everyday current account ending 4821 with 1240.50, navy, opening current; Savings with 640, green, opening savings",
  ),
  read("Open the Ledge supplies account", { address: "a1/r1", action: "press" }),
] satisfies Probe[];
