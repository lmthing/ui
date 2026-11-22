import { clock, timeOfDayLine } from "../../../catalog";
import { tripsWordsFor } from "../lang";

export const bagStageOrder = [
  "checked_in",
  "security",
  "loaded",
  "in_transit",
  "unloaded",
  "carousel",
] as const;

type Scan = {
  stage: (typeof bagStageOrder)[number];
  at?: string | undefined;
  location?: string | undefined;
  done: boolean;
};
type Bag = {
  tag: string;
  active?: boolean | undefined;
  label?: string | undefined;
  weight?: string | undefined;
  flight?: string | undefined;
  carousel?: string | undefined;
  steps: readonly Scan[];
};
type Tracker = { bags: readonly Bag[]; detail?: string | undefined; reportGoto?: string | undefined };
export const scanPart = (index: number) => `scan_${index + 1}`;

export function activeBag<T extends Bag>(bags: readonly T[]): T {
  return bags.find(({ active }) => active) ?? bags[0]!;
}

function scanTime(at: string | undefined, lang?: string) {
  return at && (clock.safeParse(at).success ? timeOfDayLine(at, lang) : at);
}

export function bagView(bag: Bag, lang?: string) {
  const { bagTracker: words } = tripsWordsFor(lang);
  const latestIndex = bag.steps.reduce((latest, step, index) => (step.done ? index : latest), -1);
  const latest = bag.steps[latestIndex];
  const next = bag.steps[latestIndex + 1];
  const arrived = latest?.stage === "unloaded" || latest?.stage === "carousel";
  return {
    latest: latest ? words.status(words.stages[latest.stage]) : words.noScans,
    next: next && words.next(words.stages[next.stage]),
    trackAt: latestIndex + 2,
    carousel: arrived && bag.carousel ? words.carousel(bag.carousel) : undefined,
    scans: bag.steps.map(({ stage, at, location, done }, index) => ({
      stage: words.stages[stage],
      part: scanPart(index),
      note: done ? location : words.waiting,
      time: done ? scanTime(at, lang) : undefined,
      done,
    })),
  };
}

export function bagReading(input: Tracker, success: boolean, lang?: string) {
  const { bagTracker: words } = tripsWordsFor(lang);
  const heading = [words.heading, ...(success ? [words.success] : [])];
  const footer = [words.refresh, ...(input.reportGoto && !success ? [words.report] : [])];
  if (input.detail === "brief")
    return [
      ...heading,
      ...input.bags.map((bag) => {
        const view = bagView(bag, lang);
        return words.scan(JSON.stringify(bag.label ?? bag.tag), [
          bag.label ? JSON.stringify(bag.tag) : undefined,
          view.latest,
          view.carousel,
        ]);
      }),
      ...footer,
    ];
  const selected = activeBag(input.bags),
    view = bagView(selected, lang);
  return [
    ...heading,
    JSON.stringify(words.tag(selected.tag)),
    ...(selected.weight ? [JSON.stringify(selected.weight)] : []),
    ...(selected.flight ? [JSON.stringify(words.flight(selected.flight))] : []),
    ...(view.carousel ? [view.carousel] : []),
    ...(view.next ? [view.next] : []),
    ...view.scans.map(({ stage, time, note }) =>
      words.scan(stage, [note && JSON.stringify(note), time && JSON.stringify(time)]),
    ),
    ...footer,
  ];
}
