import { numberLine, percentLine, timeOfDayLine } from "../../../catalog";
import { tripsWordsFor, type TripsWords } from "../lang";

type Flight = {
  flight: string;
  airline: string;
  origin: string;
  originCity: string;
  destination: string;
  destinationCity: string;
  scheduledDep: string;
  estimatedDep?: string | undefined;
  scheduledArr: string;
  estimatedArr?: string | undefined;
  status: keyof TripsWords["flightStatus"]["status"];
  progress?: number | undefined;
  terminal?: string | undefined;
  gate?: string | undefined;
  baggage?: string | undefined;
  inboundFlight?: string | undefined;
  detail?: string | undefined;
};

const minutesPerHour = 60;
const minutesPerDay = 24 * minutesPerHour;
function clockMinutes(time: string) {
  const [hour, minute] = time.split(":");
  return Number(hour) * minutesPerHour + Number(minute);
}

function estimate(
  scheduled: string,
  time: string | undefined,
  words: TripsWords["flightStatus"],
  lang?: string,
) {
  if (!time) return {};
  const delta = clockMinutes(time) - clockMinutes(scheduled);
  // HH:MM has no day, so use the signed difference closest to the scheduled time.
  const later = ((delta + minutesPerDay * 1.5) % minutesPerDay) - minutesPerDay / 2;
  const delay = later > 0 ? numberLine(later, lang) : undefined;
  return {
    estimateTime: words.estimated(timeOfDayLine(time, lang)),
    scheduledNote: words.scheduledTime(timeOfDayLine(scheduled, lang), delay),
  };
}

export function flightView(flight: Flight, lang?: string) {
  const { flightStatus: words } = tripsWordsFor(lang);
  const full = flight.detail !== "brief";
  const { status, origin, destination, scheduledDep, scheduledArr, estimatedDep, estimatedArr, progress } =
    flight;
  const tone =
    status === "cancelled"
      ? "bad"
      : status === "delayed"
        ? "warn"
        : status === "landed" || status === "on_time"
          ? "good"
          : status === "scheduled"
            ? "muted"
            : "accent";
  const times = [
    {
      part: "departure",
      title: words.departure,
      scheduled: timeOfDayLine(scheduledDep, lang),
      ...estimate(scheduledDep, estimatedDep, words, lang),
      estimatePart: "estimated_departure",
    },
    ...(full
      ? [
          {
            part: "arrival",
            title: words.arrival,
            scheduled: timeOfDayLine(scheduledArr, lang),
            ...estimate(scheduledArr, estimatedArr, words, lang),
            estimatePart: "estimated_arrival",
          },
        ]
      : []),
  ];
  const visibleDetails = full ? (["terminal", "gate", "baggage"] as const) : (["gate"] as const);
  return {
    status: words.status[status],
    tone,
    route: full ? words.route(origin, destination) : undefined,
    progress: progress === undefined ? undefined : percentLine(progress, 1, lang),
    times,
    details: visibleDetails.flatMap((part) =>
      flight[part] ? [{ part, label: words[part], value: flight[part] }] : [],
    ),
    inbound: flight.inboundFlight ? words.inbound(flight.inboundFlight) : undefined,
  } as const;
}

export function flightReading(flight: Flight, lang?: string) {
  const { flightStatus: words } = tripsWordsFor(lang);
  const view = flightView(flight, lang);
  return [
    view.status,
    ...(view.route
      ? [view.route, flight.originCity, flight.destinationCity].map((line) => JSON.stringify(line))
      : []),
    ...(view.route && view.progress ? [words.detail(words.ofRoute, view.progress)] : []),
    ...view.times.flatMap(({ title, scheduled, estimateTime, scheduledNote }) => [
      words.detail(title, estimateTime ?? scheduled),
      ...(scheduledNote ? [scheduledNote] : []),
    ]),
    ...view.details.map(({ label, value }) => words.detail(label, JSON.stringify(value))),
    words.refresh,
    ...(view.inbound ? [JSON.stringify(view.inbound)] : []),
  ];
}
