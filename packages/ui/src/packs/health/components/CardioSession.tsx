import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { cardioControls, cardioMetrics, cardioReading, cardioSplits } from "../copy";
import { healthWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-CardioSession.generated";

const activities = ["run", "ride", "walk", "swim", "hike"] as const;
const isoOffset = z.iso.datetime({ offset: true });
const timestamp = z
  .string()
  .max(40)
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/)
  .refine((value) => isoOffset.safeParse(value).success);
// prettier-ignore
const liveClock = { kind: "up", id: "session", from: "elapsedSeconds", prop: "elapsedSeconds",
  when: { style: "live" } } as const;

// Core first: Timer/up cannot show distance, average pace or per-distance splits.
// prettier-ignore
export const meta = {
  id: "CardioSession",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  region: "body",
  weight: 3,
  dense: true,
  tier: "ok",
  realPath:
    "GPS distance and heart rate need device permissions; session metrics can also be entered manually.",
  writeHints: prompt.writeHints,
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["elevation", "zone", "elevation_delta"] } },
  parts: ["root", "activity", "elapsed", "distance", "pace", "elevation", "heart", "zone", "splits_heading", "title", "sub",
    "start", "pause", "resume", "lap", "finish", "start_label", "pause_label", "resume_label", "lap_label", "finish_label"],
  items: { key: "splits", parts: ["root", "label", "amount", "elevation_delta", "bar"] },
  states: ["filled", "empty", "loading", "success", "error"],
  clocks: [
    { ...liveClock, runningProp: "live", start: { part: "start", action: "start" } },
    { ...liveClock, start: { part: "resume", action: "play" }, stop: { part: "pause", action: "pause" } },
    { ...liveClock, when: { style: "live", live: true } }, // Seed an already-live clock after declaring its triggers.
    // The save trigger stays available while the elapsed clock is paused.
    { id: "save", kind: "up", when: { style: "live" }, stop: { part: "finish", action: "stop", state: "success" } },
  ],
  partTiers: { start: "ok", resume: "ok", pause: "phone", lap: "phone", finish: "phone" },
  readSuccess: true,
  read: (p, state, lang) => cardioReading(p as Parameters<typeof cardioReading>[0], state, lang),
  live: { derive: (p) => cardioControls(p as Parameters<typeof cardioControls>[0]) },
  actions: {
    parts: { start: ["start"], pause: ["pause"], resume: ["play"], lap: ["press"], finish: ["stop"] },
    when: { start: { canStart: true }, pause: { canPause: true }, resume: { canResume: true },
      lap: { canLap: true }, finish: { canFinish: true } },
  },
} as const satisfies c.Meta;

// prettier-ignore
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    activity: z.enum(activities),
    startedAt: timestamp,
    elapsedSeconds: z.number().min(0),
    distance: z.number().min(0),
    unit: z.enum(["km", "mi"]),
    elevation: z.number().optional(),
    hrAvg: z.number().optional(),
    hrZone: z.int().min(1).max(5).optional(),
    splits: z.array(z.strictObject({
      label: c.text(8), seconds: z.number().positive(), elevationDelta: z.number().optional(),
    })).min(0).max(30),
    live: z.boolean().default(false),
    style: z.enum(["summary", "live"]).default("summary"),
  })
  .overwrite((p) => ({ ...p, ...cardioControls(p) }));

export function fallback({ cast }: c.FallbackInput): z.input<typeof props> {
  const activity = z.enum(activities).safeParse(c.thingOf(cast)?.type);
  return {
    activity: activity.data ?? "run",
    startedAt: "1970-01-01T00:00:00Z",
    elapsedSeconds: 0,
    distance: 0,
    unit: "km",
    splits: [],
  };
}

export const examples = [
  {
    activity: "run",
    startedAt: "2026-11-19T07:00:00-05:00",
    elapsedSeconds: 1550,
    distance: 5,
    unit: "km",
    elevation: 42,
    hrAvg: 151,
    hrZone: 3,
    splits: [
      { label: "Km 1", seconds: 326, elevationDelta: 21 },
      { label: "Km 2", seconds: 309, elevationDelta: 14 },
      { label: "Km 3", seconds: 313, elevationDelta: 7 },
      { label: "Km 4", seconds: 304, elevationDelta: -12 },
      { label: "Km 5", seconds: 298, elevationDelta: 0 },
    ],
  },
  {
    activity: "walk",
    startedAt: "2026-11-19T15:00:00+00:00",
    elapsedSeconds: 1740,
    distance: 1.8,
    unit: "mi",
    splits: [{ label: "Mile 1", seconds: 945 }],
    style: "live",
    live: true,
  },
  {
    activity: "ride",
    startedAt: "2026-11-19T07:00:00Z",
    elapsedSeconds: 0,
    distance: 0,
    unit: "km",
    splits: [],
    style: "live",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("CardioSession");
export const probes = [
  choose(
    "Track my 5 km run with a clock, distance, and average pace together, and let me compare how fast I ran each kilometre",
  ),
  choose("Give me one stopwatch that counts up, with start and stop and nothing else", "Timer"),
  write(
    "Show a finished 2 km run started at 07:00 UTC on November 19, 2026. Elapsed time is 640 seconds, with kilometre splits of 330 and 310 seconds.",
  ),
  {
    ...write(
      "Show a finished run started at 07:00 UTC on November 19, 2026: 2 km in 640 seconds, splits of 330 and 310 seconds, 45 m elevation gain and heart-rate zone 3. Keep elevation and zone in the data but hide both on screen. Only change the amount of detail; no spacing or border override.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Start tracking this ride now", { address: "c1/start", action: "start" }, 2),
] satisfies c.Probe[];

type Seed = c.Props<typeof props, typeof meta>;
type View = Seed & { density: c.ThemeDensity };
type Words = ReturnType<typeof healthWordsFor>["cardio"];

function Metrics({ p, lang, loading }: { p: View; lang: string; loading: boolean }) {
  return (
    <kit.KitGrid density={p.density}>
      {cardioMetrics(p, lang).map(({ part, label, value }) =>
        loading ? (
          <kit.KitSkeleton
            key={part}
            shape="figure"
            inset="none"
            content={[
              ["label", label],
              ["number", value, "start", "compact"],
            ]}
          />
        ) : (
          <kit.KitContent key={part}>
            <kit.KitText part={null} role="label" tone="muted">
              {label}
            </kit.KitText>
            <kit.KitText part={part} role="number" numberScale="compact" tabular>
              {value}
            </kit.KitText>
          </kit.KitContent>
        ),
      )}
    </kit.KitGrid>
  );
}

function Splits({ p, w, lang, loading }: { p: View; w: Words; lang: string; loading: boolean }) {
  const splits = cardioSplits(p, lang);
  if (!splits.length) return null;
  return (
    <kit.KitContent group="response" density={p.density}>
      {loading ? (
        <kit.KitSkeleton shape="figure" inset="none" content={[["label", w.splits]]} />
      ) : (
        <kit.KitText part="splits_heading" role="label" tone="muted">
          {w.splits}
        </kit.KitText>
      )}
      {splits.map(({ id, label, duration, ratio, delta }) => (
        <kit.KitRow item={id} key={id} label={label} inline density={p.density}>
          <kit.KitContent>
            <kit.KitGrid fitLast>
              {loading
                ? [
                    <kit.KitSkeleton
                      key="label"
                      shape="figure"
                      inset="none"
                      content={[["label", label + (delta ? w.splitDelta(delta) : "")]]}
                    />,
                    <kit.KitSkeleton
                      key="amount"
                      shape="figure"
                      inset="none"
                      content={[["number", duration, "end", "compact"]]}
                    />,
                  ]
                : [
                    <kit.KitText key="label" part="label" role="label">
                      {label}
                      {delta && (
                        <kit.KitText part="elevation_delta" role="label" tone="muted" tabular>
                          {w.splitDelta(delta)}
                        </kit.KitText>
                      )}
                    </kit.KitText>,
                    <kit.KitText key="amount" part="amount" role="number" numberScale="compact" tabular>
                      {duration}
                    </kit.KitText>,
                  ]}
            </kit.KitGrid>
            <kit.KitStepsTrack part="bar" style="bar" count={1} at={loading ? 0 : ratio} />
          </kit.KitContent>
        </kit.KitRow>
      ))}
    </kit.KitContent>
  );
}

function Controls({ p, w, loading }: { p: View; w: Words; loading: boolean }) {
  const { canStart, canPause, canResume, canLap, canFinish } = cardioControls(p);
  if (p.style !== "live") return null;
  const controls = [
    ...(canStart ? ([["start", "start", "primary"]] as const) : []),
    ...(canPause ? ([["pause", "pause", "secondary"]] as const) : []),
    ...(canResume ? ([["resume", "play", "primary"]] as const) : []),
    ...(canLap ? ([["lap", "press", "quiet"]] as const) : []),
    ...(canFinish ? ([["finish", "stop", canResume ? "secondary" : "primary"]] as const) : []),
  ];
  const buttons = controls.map(([part, action, kind]) =>
    loading ? (
      <kit.KitSkeleton key={part} shape="control" inset="none" full label={w[part]} />
    ) : (
      <kit.KitAction key={part} full {...{ part, action, kind }} label={w[part]} />
    ),
  );
  return (
    <kit.KitContent group="response">
      {canStart ? buttons : <kit.KitGrid columns={controls.length === 3 ? 3 : 2}>{buttons}</kit.KitGrid>}
    </kit.KitContent>
  );
}

export function CardioSession(input: Seed) {
  const p = kit.useLiveControls(meta, input) as Seed;
  const state = kit.useComponentState();
  const {
    lang,
    words: { cardio: w },
  } = kit.useWords(healthWordsFor);
  const { density } = kit.useKit();
  const detail = kit.useVariant("detail", meta.variants.detail, p.detail);
  const surface = "card";
  const loading = state === "loading";
  const view = { ...p, density, detail };
  const elapsed = c.clockLine(p.elapsedSeconds, lang),
    activity = w.activity[p.activity];
  return (
    <kit.KitCard part="root" padded {...{ density, surface }}>
      {state === "empty" ? (
        <kit.KitEmpty decorativeIcon />
      ) : state === "error" ? (
        <kit.KitEmpty decorativeIcon icon="alert" title={w.error} sub={w.errorDetail} />
      ) : (
        <>
          {state === "success" && (
            <kit.KitText part="title" role="label" tone="good">
              {w.saved}
            </kit.KitText>
          )}
          <kit.KitContent>
            {loading ? (
              <kit.KitSkeleton
                shape="figure"
                inset="none"
                content={[
                  ["label", activity],
                  ["number", elapsed],
                ]}
              />
            ) : (
              <>
                <kit.KitText part="activity" role="label" tone="muted">
                  {activity}
                </kit.KitText>
                <kit.KitText part="elapsed" role="number" tabular>
                  {elapsed}
                </kit.KitText>
                <kit.KitText part={null} role="label" tone="muted">
                  {w.elapsed}
                </kit.KitText>
              </>
            )}
          </kit.KitContent>
          <Metrics p={view} {...{ lang, loading }} />
          {(state === "filled" || loading) && <Controls p={view} {...{ w, loading }} />}
          <Splits p={view} {...{ w, lang, loading }} />
        </>
      )}
    </kit.KitCard>
  );
}
