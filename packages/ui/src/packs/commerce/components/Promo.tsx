import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Banner/notice announces information, not an expiring shopping offer with a copyable discount code.
export const meta = {
  id: "Promo",
  status: "draft",
  group: "content",
  purpose: "Notice an offer, copy its discount code or open the offer.",
  pick: "A shop discount or offer with optional copyable code, expiry and product photo. Not an urgent warning or service notice (Banner) or a headline fact (Hero).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The offer is stored on the device, and its code is checked at checkout.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["tinted", "card"],
    emphasis: ["normal", "quiet"],
  },
  parts: ["root", "title", "code", "ends", "photo"],
  states: ["filled"],
  actions: { parts: { root: ["press"], code: ["press"] }, when: { code: { has_code: true } } },
  read: (input, state, lang): string[] => {
    const { ends } = input as { ends?: string };
    return state === "filled" && ends
      ? [c.documentFieldLine("ends", c.appointmentDate(ends, lang), lang)]
      : [];
  },
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    title: c.text(36),
    code: c.text(12).optional(),
    ends: c.isoDate.optional(),
    photo: c.photo.optional(),
    goto: c.screenId,
    ...c.variantProps(meta.variants),
  })
  .overwrite((value) => ({ ...value, has_code: value.code !== undefined }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const item = c.itemsOf(cast, 1)[0];
  return {
    title: (item && c.titleOf(item, 36, c.thingOf(cast))) || c.placeholderTitle(0, lang),
    goto: "detail",
  };
}

export const examples = [
  { title: "20% off fern pots", code: "FERN20", ends: "2026-11-30", photo: "lib:fern", goto: "fern_offer" },
  {
    title: "Save on reflective leads",
    goto: "lead_offer",
    density: "compact",
    surface: "card",
    emphasis: "quiet",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Promo");
export const probes = [
  choose("Show a shop discount card with a code I can copy, the date it ends and a link to the offer"),
  choose(
    "Warn people at the top that the app is offline and changes cannot sync, with no sale or discount",
    "Banner",
  ),
  write(
    "Show 20% off fern pots, with code FERN20, a lib:fern photo and an end date of 2026-11-30. Open fern_offer.",
  ),
  read("Copy the FERN20 discount code", { address: "p1/code", action: "press" }),
] satisfies c.Probe[];
