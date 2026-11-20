import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Card/feature cannot show an event's date block, attendees and two RSVP actions.
export const meta = {
  id: "EventCard",
  status: "draft",
  group: "content",
  purpose: "See a community event and say whether you’re going or interested.",
  pick: "An event to join in a community, with its date block, attendees and Going or Interested controls. Not organising one's own gathering (events), a provider booking (Appointment), or a featured preview without RSVPs (Card).",
  writeHints: [
    "Use a date in YYYY-MM-DD and 24-hour HH:MM. going is the total number going; attendees lists at most five names from that total.",
  ],
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "An event in a shared app.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], media: ["cover", "none"] },
  variantParts: { "media.none": { hides: ["photo"] } },
  parts: ["root", "title", "date", "time", "place", "photo", "attendees", "count", "going", "interested"],
  states: ["filled", "loading"],
  actions: {
    parts: { root: ["press"], going: ["press"], interested: ["press"] },
    noGoto: { parts: ["going", "interested"] },
  },
  read: (input, _state, lang): string[] => {
    const { date, time, going, attendees } = input as z.output<typeof props>;
    return [
      c.appointmentDate(date, lang),
      c.timeOfDayLine(time, lang),
      c.numberLine(going, lang),
      ...(attendees ?? []),
    ];
  },
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    title: c.text(40),
    date: c.isoDate,
    time: c.clock,
    place: c.text(40),
    photo: c.photo.optional(),
    going: z.int().min(0).max(999999),
    status: z.enum(["none", "going", "interested"]).default("none"),
    goto: c.screenId,
    attendees: z.array(c.text(24)).min(0).max(5).optional(),
  })
  .refine(({ going, attendees }) => !attendees || attendees.length <= going, { path: ["attendees"] })
  .overwrite((value) => (value.media === "none" ? { ...value, photo: undefined } : value));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const item = c.itemsOf(cast, 1)[0];
  const values = item ? c.textsOf(item, thing) : [];
  return {
    title: (item && c.titleOf(item, 40, thing)) || c.placeholderTitle(0, lang),
    date: values.find((value) => c.isoDate.safeParse(value).success) ?? "1970-01-01",
    time: values.find((value) => c.clock.safeParse(value).success) ?? "00:00",
    place: (item && c.detailOf(item, 40, thing)) || c.wordsFor(lang).placeholderDetail,
    going: 0,
    status: "none",
    goto: c.screenId.safeParse(item?.id).data ?? "event",
  };
}

export const examples = [
  {
    title: "November cutting swap",
    date: "2026-11-28",
    time: "14:00",
    place: "Community greenhouse",
    photo: "lib:plants",
    going: 14,
    status: "none",
    goto: "swap_meet",
    attendees: ["Maya", "Sam", "Jo"],
  },
  {
    density: "compact",
    surface: "outlined",
    media: "none",
    title: "Sunday riverside walk",
    date: "2026-11-29",
    time: "09:00",
    place: "South gate",
    photo: "lib:dog",
    going: 6,
    status: "interested",
    goto: "river_walk",
    attendees: ["Anna", "Ben"],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("EventCard");
export const probes = [
  choose(
    "Show one upcoming neighbourhood gathering for members to join, with a date block, who's attending and buttons for Going and Interested.",
  ),
  choose(
    "Feature one favourite fern with a photo, a title, a short note and a link to its details. There is no event or RSVP.",
    "Card",
  ),
  write(
    "Show the community cutting swap at the greenhouse on 2026-11-28 at 14:00, with fourteen going including Maya and Sam. Link to swap_meet.",
  ),
  {
    ...write(
      "Show the cutting swap with replies elsewhere. Keep its supplied greenhouse photo in the data but show the event without a photo, keeping the date and RSVP buttons.",
    ),
    variant: { axis: "media", value: "none" },
  },
  read("Say I’m going to the cutting swap.", { address: "e1/going", action: "press" }),
] satisfies c.Probe[];
