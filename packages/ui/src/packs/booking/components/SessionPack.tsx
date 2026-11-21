import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Progress/compact shows an amount against a target, not prepaid credits with expiry and redeem/renew actions.
export const meta = {
  id: "SessionPack",
  status: "draft",
  group: "data",
  purpose: "See how many prepaid sessions are left, redeem one or renew the bundle.",
  pick: "Track a prepaid bundle of appointments: paid session credits left, their expiry, redeeming a visit and renewing. Not visit stamps (Loyalty), bars against targets (Progress), or an unpaid bill (Invoice).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Prepaid session balances live on the provider's device; online top-up uses a payment service.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    detail: ["full", "brief"],
  },
  variantParts: {
    "detail.brief": {
      hides: ["service", "label", "amount", "redeem", "redeem_label", "renew", "renew_label"],
      adds: ["remaining"],
    },
  },
  parts: [
    "root",
    "title",
    "service",
    "label",
    "amount",
    "remaining",
    "expiry",
    "feedback",
    "redeem",
    "redeem_label",
    "renew",
    "renew_label",
  ],
  states: ["filled", "empty", "loading", "success", "error"],
  partTiers: { renew: "service" },
  confirmParts: ["redeem"],
  actions: {
    parts: { redeem: ["press"], renew: ["press"] },
    when: { redeem: { canRedeem: true }, renew: { canRenew: true } },
  },
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    packId: c.text(24).meta({ kind: undefined }),
    title: c.text(28),
    total: z.int().min(2).max(50),
    used: z.int().min(0).max(50),
    expires: z.iso.date().optional(),
    service: c.text(28).optional(),
    renewGoto: c.screenId.optional(),
  })
  .refine(({ total, used }) => used <= total, { path: ["used"], message: "Used cannot exceed total" });

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const item = c.itemsOf(cast, 1)[0];
  return {
    packId: c.placeholderValue,
    title: (item && c.titleOf(item, 28, thing)) || c.placeholderTitle(0, lang),
    total: 2,
    used: 2,
  };
}

const ledge = {
  packId: "repotting",
  title: "Repotting bundle",
  total: 6,
  used: 2,
  service: "Repotting visits",
  expires: "2026-12-12",
  renewGoto: "renew",
} satisfies z.input<typeof props>;

export const examples = [
  ledge,
  {
    packId: "park_walks",
    title: "Park walk bundle",
    total: 10,
    used: 7,
    expires: "2026-12-20",
    renewGoto: "renew",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("SessionPack");
export const probes = [
  choose(
    "I prepaid for six repotting visits. Show how many I've got left, when they expire, and let me use one at my next visit.",
  ),
  choose(
    "Show two compact target bars: eight of twelve class places booked and six of twelve checked in. Just totals, no credits or controls.",
    "Progress",
  ),
  write(
    "Show my prepaid repotting bundle, reference repotting, with six visits total and two used. It expires December 12, 2026.",
  ),
  read("Use one of my prepaid repotting visits.", { address: "s1/redeem", action: "press" }),
] satisfies c.Probe[];
