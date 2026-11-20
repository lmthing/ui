import { z } from "zod";
import * as c from "../../../catalog";
import { seedDate, seedTime, seedTitles } from "../seeds";

// Core first: KeyValue/default cannot present an issued admission pass with a scannable code.
export const meta = {
  id: "Ticket",
  status: "draft",
  group: "content",
  purpose: "Show the holder's admission pass and code for one event.",
  pick: "One issued event admission pass with holder, ticket type, venue and scannable ticket number. Not ordinary label/value facts (KeyValue), a travel confirmation (Reservation), a discount code (Promo) or the door scanner (Door).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The app issues the admission ticket; the organiser scans it at the door.",
  variants: { density: ["comfortable", "compact"], align: ["start", "center"] },
  parts: ["root", "event", "date", "time", "place", "type", "holder", "number", "code"],
  states: ["filled", "success"],
  readSuccess: true,
  read: (input): string[] => {
    const { date, time } = input as z.output<typeof props>;
    return [date, time];
  },
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  event: c.text(32),
  date: c.isoDate,
  time: c.clock,
  place: c.text(32),
  type: c.text(16),
  holder: c.text(24),
  number: c.text(12),
});

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const { placeholderDetail, placeholderLabel, placeholderValue } = c.wordsFor(input.lang);
  return {
    event: seedTitles(input, 32, 1)[0]!,
    date: seedDate,
    time: seedTime,
    place: c.clip(placeholderDetail, 32),
    type: c.clip(placeholderLabel, 16),
    holder: c.clip(c.placeholderTitle(1, input.lang), 24),
    number: c.clip(placeholderValue, 12),
  };
}

export const examples = [
  {
    event: "Harbour Benefit",
    date: "2027-04-09",
    time: "18:30",
    place: "Harbour Hall",
    type: "Adult",
    holder: "Imani Cole",
    number: "HB0142",
  },
  {
    event: "Studio Open Night",
    date: "2027-05-15",
    time: "19:00",
    place: "Riverside Studio",
    type: "Member",
    holder: "Hugo Wells",
    number: "SO0081",
    density: "compact",
    align: "center",
  },
] satisfies z.input<typeof props>[];

const { choose, write } = c.probesFor("Ticket");
export const probes = [
  choose(
    "Show my issued admission pass for a benefit gala: my name, ticket type, venue and a big scannable code for entry.",
  ),
  choose(
    "Show plain label/value facts about the hall: address, dress code and closing time. No issued pass or code.",
    "KeyValue",
  ),
  write(
    "Write my Adult admission pass for Harbour Benefit at Harbour Hall, 2027-04-09 at 18:30. Holder Imani Cole, ticket number HB0142.",
  ),
] satisfies c.Probe[];
