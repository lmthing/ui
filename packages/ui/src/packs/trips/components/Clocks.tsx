import { z } from "zod";
import {
  itemsOf,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
} from "../../../catalog";

const zones = [
  "Etc/UTC",
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Vancouver",
  "America/Phoenix",
  "America/Denver",
  "America/Chicago",
  "America/Mexico_City",
  "America/New_York",
  "America/Toronto",
  "America/Halifax",
  "America/Bogota",
  "America/Lima",
  "America/Santiago",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "Atlantic/Reykjavik",
  "Europe/London",
  "Europe/Dublin",
  "Europe/Lisbon",
  "Europe/Madrid",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Zurich",
  "Europe/Stockholm",
  "Europe/Oslo",
  "Europe/Copenhagen",
  "Europe/Warsaw",
  "Europe/Athens",
  "Europe/Istanbul",
  "Europe/Moscow",
  "Africa/Cairo",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Jerusalem",
  "Asia/Kolkata",
  "Asia/Kathmandu",
  "Asia/Bangkok",
  "Asia/Jakarta",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Shanghai",
  "Asia/Manila",
  "Asia/Taipei",
  "Asia/Seoul",
  "Asia/Tokyo",
  "Australia/Perth",
  "Australia/Adelaide",
  "Australia/Brisbane",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
] as const;

// Core first: Timer/up measures elapsed time, not simultaneous local times and differences from home.
export const meta = {
  id: "Clocks",
  status: "draft",
  group: "data",
  purpose: "Compare local time in several places with the time back home.",
  pick: "Current local clock times in two to four named time zones, with offsets from home. Not elapsed or remaining time (Timer) or scheduled events (Timeline).",
  writeHints: [
    "Use 2–4 labeled places and IANA time zone IDs such as Europe/London, America/New_York or Asia/Tokyo. The first place is home. Do not write times, differences or daylight flags.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The device's clock and time zone data provide the current times and offsets.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"] },
  parts: ["root"],
  items: { key: "places", parts: ["root", "label", "time", "offset", "daylight"] },
  states: ["filled"],
} as const satisfies Meta;

export const props = z.strictObject({
  ...variantProps(meta.variants),
  places: z
    .array(z.strictObject({ label: text(16), zone: z.enum(zones) }))
    .min(2)
    .max(4),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 2);
  return {
    places: [0, 1].map((index) => {
      const item = items[index];
      return {
        label: (item && titleOf(item, 16, thing)) ?? placeholderTitle(index, lang),
        zone: "Etc/UTC",
      };
    }),
  };
}

export const examples = [
  {
    places: [
      { label: "London", zone: "Europe/London" },
      { label: "Tokyo", zone: "Asia/Tokyo" },
    ],
  },
  {
    density: "compact",
    surface: "plain",
    places: [
      { label: "New York", zone: "America/New_York" },
      { label: "Vancouver", zone: "America/Vancouver" },
      { label: "Auckland", zone: "Pacific/Auckland" },
      { label: "Kathmandu", zone: "Asia/Kathmandu" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write } = probesFor("Clocks");
export const probes = [
  choose("Show what time it is right now in London, Tokyo and New York side by side, compared with London"),
  choose("Give me a stopwatch with start and stop so I can measure the time a walk takes", "Timer"),
  write("Compare the current times in London at home, Tokyo and New York."),
] satisfies Probe[];
