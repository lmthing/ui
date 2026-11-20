import { z } from "zod";
import {
  detailOf,
  itemsOf,
  photo,
  placeholderDetail,
  placeholderTitle,
  placeholderValue,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: Timeline/default lays out events or plans; it does not identify who changed a record with avatars.
export const meta = {
  id: "ActivityLog",
  status: "draft",
  group: "data",
  purpose: "See who changed a shared record, what changed, and when it happened.",
  pick: "Audit changes by several people with actor portraits, times and links to changed records. Not scheduled events in time order (Timeline), one client's history (ClientHistory) or shift notes (Handover).",
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "A change log kept by a shared app.",
  variants: { density: ["comfortable", "compact"] },
  parts: ["root"],
  items: { key: "entries", parts: ["root", "who", "photo", "text", "time"] },
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"] } },
} as const satisfies Meta;

export const props = z.strictObject({
  ...variantProps(meta.variants),
  entries: z
    .array(z.strictObject({ who: text(20), photo, text: text(80), time: text(12), goto: screenId }))
    .min(1)
    .max(6),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const entries = itemsOf(cast, 6, thing?.type).map((item, i) => ({
    who: titleOf(item, 20, thing) ?? placeholderTitle(i, lang),
    text: detailOf(item, 80, thing) ?? placeholderDetail,
    photo: "lib:people",
    time: placeholderValue,
    goto: "detail",
  }));
  return {
    entries: entries.length
      ? entries
      : [
          {
            who: placeholderTitle(0, lang),
            text: placeholderDetail,
            photo: "lib:people",
            time: placeholderValue,
            goto: "detail",
          },
        ],
  };
}

export const examples = [
  {
    entries: [
      {
        who: "Ana",
        photo: "lib:people",
        text: "Marked the Boston fern as watered.",
        time: "09:10",
        goto: "fern",
      },
      {
        who: "Inez",
        photo: "lib:people",
        text: "Moved the rubber plant to the study.",
        time: "08:45",
        goto: "rubber",
      },
    ],
  },
  {
    density: "compact",
    entries: [
      {
        who: "Sam",
        photo: "lib:people",
        text: "Changed Milo's walk to the canal loop.",
        time: "14:20",
        goto: "milo",
      },
      { who: "Noor", photo: "lib:people", text: "Logged Pip's first walk.", time: "13:50", goto: "pip" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("ActivityLog");
export const probes = [
  choose(
    "Audit edits by staff. Each row needs the actor's portrait and name, the edit they made, its timestamp, and a link to the changed record.",
  ),
  choose(
    "Lay out tomorrow's planned stops in time order, each with a time and one note. Nobody is editing records.",
    "Timeline",
  ),
  write(
    "Log that Ana marked the Boston fern as watered at 09:10. Use lib:people for the portrait and link to fern.",
  ),
  read("Open the record that Inez moved to the study.", { address: "s1/r2", action: "press" }),
] satisfies Probe[];
