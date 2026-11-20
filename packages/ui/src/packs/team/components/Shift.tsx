import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Card/plain previews a record but cannot express shift status and separate swap and offer actions.
export const meta = {
  id: "Shift",
  status: "draft",
  group: "content",
  purpose: "See one assigned shift and ask to swap it or offer it to someone else.",
  pick: "One assigned staff shift with start and end times, coworkers and swap or offer actions. Not a record preview (Card), the whole rota (Roster), or a client's booking (Appointment).",
  writeHints: [
    'Use detail "brief" only when asked to hide where and with whom; retain those values in place and with. A request to hide details does not change row spacing: set density to null unless tighter spacing is specifically requested. Set detail to null for the normal card.',
  ],
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "The shift is a record in a shared rota.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["place", "with"] } },
  parts: ["root", "date", "from", "to", "place", "role", "with", "status", "swap", "offer"],
  states: ["filled", "loading"],
  actions: { parts: { swap: ["press"], offer: ["press"] } },
  read: (input, _state, lang): string[] => {
    const { date, from, to, status, detail, place, with: coworkers } = input as z.output<typeof props>;
    return [
      c.appointmentDate(date, lang),
      `${c.timeOfDayLine(from, lang)}–${c.timeOfDayLine(to, lang)}`,
      status,
      ...(detail === "brief"
        ? []
        : [place, coworkers].filter((value) => value !== undefined).map((value) => JSON.stringify(value))),
    ];
  },
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  date: c.isoDate,
  from: c.clock,
  to: c.clock,
  // The custom reader controls visibility; the wire keeps both authored values.
  place: c.text(28).optional().meta({ kind: undefined }),
  role: c.text(16).optional(),
  with: c.text(48).optional().meta({ kind: undefined }),
  status: z.enum(["confirmed", "offered", "swap_requested"]),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const [item] = c.itemsOf(cast, 1);
  const thing = c.thingOf(cast);
  return {
    date: "2026-11-16",
    from: "09:00",
    to: "12:00",
    role: (item && c.titleOf(item, 16, thing)) ?? c.placeholderTitle(0, lang),
    place: item && c.detailOf(item, 28, thing),
    status: "confirmed",
  };
}

export const examples = [
  {
    date: "2026-11-16",
    from: "07:00",
    to: "12:00",
    place: "East greenhouse",
    role: "Morning care",
    with: "Anna and Rae",
    status: "confirmed",
  },
  {
    density: "compact",
    detail: "brief",
    date: "2026-11-21",
    from: "08:00",
    to: "13:00",
    place: "Riverside",
    role: "Park walks",
    with: "Sam",
    status: "swap_requested",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Shift");
export const probes = [
  choose(
    "Show my one assigned work shift with hours, location and coworkers, and let me ask for a swap or offer it to someone else.",
  ),
  choose(
    "Show a static preview for a greenhouse with a short title, photo and description, without staff schedules or work actions.",
    "Card",
  ),
  write("Show my confirmed 2026-11-16 shift, 07:00–12:00, at East greenhouse with Anna, role Morning care."),
  {
    ...write(
      "Show my confirmed 2026-11-16 shift, 07:00–12:00. Save East greenhouse and Anna, but hide where and with whom from this card.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Ask to swap my morning care shift", { address: "s1/swap", action: "press" }),
] satisfies c.Probe[];
