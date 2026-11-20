import { z } from "zod";
import * as c from "../../../catalog";
import { seedTitles } from "../seeds";

// Core first: Checklist/default cannot reserve gifts across guests or show claim ownership only to hosts.
export const meta = {
  id: "Registry",
  status: "draft",
  group: "input",
  purpose: "Share a gift list and keep guests from choosing the same gift.",
  pick: "A shared event gift list with gift prices, where to buy, and who claimed a gift for hosts. Not a checklist for personal tasks (Checklist), shopping (ProductGrid) or a personal wishlist (Wishlist).",
  writeHints: [
    "Only give by for an already claimed gift in the host view; omit it for guests. Prices are numbers.",
    'If explicitly asked for rows without photos, set lead to "none" and retain any supplied photo references.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "people",
  realPath: "A shared app reserves each gift so two guests cannot claim the same one.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], lead: ["thumb", "none"] },
  variantParts: { "lead.none": { hides: ["photo"] } },
  parts: ["root"],
  items: {
    key: "gifts",
    parts: ["root", "title", "photo", "price", "where", "claimed", "by", "claim", "unclaim"],
  },
  confirmParts: ["unclaim"],
  states: ["filled", "empty", "success"],
  actions: {
    items: { claim: ["press"], unclaim: ["press"] },
    when: { claim: { claimed: false, host: false }, unclaim: { claimed: true, host: true } },
  },
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const { gifts } = input as z.output<typeof props>;
    return gifts.map(({ price, claimed }, index) =>
      [
        `r${index + 1}`,
        claimed ? "claimed" : "unclaimed",
        price === undefined ? undefined : c.numberLine(price, lang),
      ]
        .filter((value) => value !== undefined)
        .join(" · "),
    );
  },
} as const satisfies c.Meta;

const gift = z.strictObject({
  title: c.text(28),
  photo: c.photo.optional(),
  price: z.number().nonnegative().optional(),
  where: c.text(24).optional(),
  claimed: z.boolean(),
  by: c.text(16).optional(),
});
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    gifts: z.array(gift).min(1).max(12),
    host: z.boolean(),
  })
  .overwrite((input) => ({
    ...input,
    gifts: input.gifts.map((gift) => ({
      ...gift,
      by: input.host && gift.claimed ? gift.by : undefined,
      photo: input.lead === "none" ? undefined : gift.photo,
    })),
  }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return { gifts: seedTitles(input, 28, 3).map((title) => ({ title, claimed: false })), host: false };
}

export const examples = [
  {
    gifts: [
      { title: "Linen tablecloth", photo: "lib:linen", price: 45, where: "Loom House", claimed: false },
      { title: "Blue serving bowl", photo: "lib:bowl", price: 32, claimed: true },
    ],
    host: false,
  },
  {
    gifts: [
      {
        title: "Stoneware platter",
        photo: "lib:platter",
        price: 60,
        where: "Clay Studio",
        claimed: true,
        by: "Imani Cole",
      },
    ],
    host: true,
    density: "compact",
    surface: "outlined",
    lead: "none",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Registry");
export const probes = [
  choose(
    "Let wedding guests reserve gifts from our shared list so nobody buys the same gift; show hosts who reserved each one.",
  ),
  choose(
    "Show jobs I can tick off as I finish them, like posting invitations or ordering flowers. No gifts, prices or reservations.",
    "Checklist",
  ),
  write(
    "Show guests a wedding gift list with an unclaimed Linen tablecloth, 45 at Loom House, photo lib:linen.",
  ),
  {
    ...write(
      "Show guests the unclaimed linen tablecloth, 45, with photo lib:linen in the data but no photo thumbnails on the list.",
    ),
    variant: { axis: "lead", value: "none" },
  },
  read("Reserve the linen tablecloth as my gift.", { address: "r1/r1/claim", action: "press" }),
] satisfies c.Probe[];
