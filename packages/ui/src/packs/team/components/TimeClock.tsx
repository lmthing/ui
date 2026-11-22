import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { activeBreakStart, timeClockDisplay, timeClockPreview, timeClockReading } from "../copy";
import { teamWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-TimeClock.generated";

// Core first: Timer/up measures an activity but does not record clock-ins, clock-outs and breaks for work.
export const meta = {
  id: "TimeClock",
  status: "ready",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Clock events stay on the device; sharing them with a manager needs a shared app.",
  variants: {
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["since"] } },
  parts: [
    "root",
    "shift",
    "status",
    "since",
    "elapsed",
    "elapsed_label",
    "breaks",
    "clock",
    "clock_label",
    "break",
    "break_label",
    "verification",
    "break_elapsed",
    "break_elapsed_label",
  ],
  states: ["filled", "success"],
  actions: { parts: { clock: ["press"], break: ["press"] }, when: { break: { on: true } } },
  partTiersBy: { clock: { prop: "style", tiers: { kiosk: "ok" } } },
  clocks: [
    {
      id: "break_elapsed",
      kind: "up",
      prop: "liveBreakSeconds",
      runningProp: "liveBreakRunning",
      when: { on: true, breakTimer: true },
      timestamp: activeBreakStart,
    },
  ],
  deviceData: ["shiftClock"],
  previewDeviceData: timeClockPreview,
  readSuccess: true,
  read: timeClockReading,
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  style: z.enum(["personal", "kiosk"]).default("personal"),
  on: z.boolean(),
  since: c.clock.optional(),
  shift: c.text(28).optional(),
  verification: z.enum(["geofence", "pin"]).optional().meta({ kind: undefined }),
  breakTimer: z.boolean().optional(),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const [item] = c.itemsOf(cast, 1);
  return { on: false, shift: (item && c.titleOf(item, 28, c.thingOf(cast))) ?? c.placeholderTitle(0, lang) };
}

export const examples = [
  { on: true, since: "07:00", shift: "Morning greenhouse care" },
  { on: false, shift: "Afternoon park walks" },
  { on: false, shift: "Morning greenhouse care", style: "kiosk", verification: "geofence" },
  { on: true, since: "07:00", shift: "Morning greenhouse care", breakTimer: true },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("TimeClock");
export const probes = [
  choose("Let staff clock in and out of work and record breaks during the active shift."),
  choose(
    "Give me a five-minute countdown for soaking a plant, with start and reset, without recording work hours.",
    "Timer",
  ),
  write("I clocked into Morning greenhouse care at 07:00. Show the active work clock with a break control."),
  {
    ...write(
      "I'm on the Morning greenhouse care shift and clocked in at 07:00. Keep that start time in the data but hide it on the work clock. Keep elapsed time and today's breaks visible. Leave spacing and the card treatment up to the app, with no overrides for those.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Take a break on this active shift", { address: "t1/break", action: "press" }),
  {
    ...write(
      "Set up a shared staff time-clock kiosk for Morning greenhouse care. Nobody is clocked in. Require a staff PIN check when clocking in, without showing or storing any PIN digits.",
    ),
    expectProps: { style: "kiosk", on: false, verification: "pin" },
  },
  {
    ...write(
      "I'm clocked into Morning greenhouse care since 07:00. Show a live count-up timer for my current break, separate from time on shift.",
    ),
    expectProps: { on: true, breakTimer: true },
  },
] satisfies c.Probe[];

type ClockProps = c.Props<typeof props, typeof meta>;

export function TimeClock(input: ClockProps) {
  const state = kit.useComponentState();
  const { lang, words } = kit.useWords(teamWordsFor);
  const density = kit.useKit().density;
  const surface = "card";
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const live = kit.useLiveControls(meta, input) as ClockProps & {
    liveBreakSeconds?: number;
    liveBreakRunning?: boolean;
  };
  const copy = timeClockDisplay({ ...live, detail }, state, kit.useDeviceData(), lang, words.timeClock);
  return (
    <kit.KitCard part="root" padded {...{ density, surface }}>
      <kit.KitHeader
        title={{ text: copy.shift, part: "shift", role: "body", strong: true }}
        meta={[
          { text: copy.status, part: "status", tone: state === "success" ? "good" : "muted" },
          { text: copy.since, part: "since" },
        ]}
        density={density}
      />
      <ClockFigures {...{ copy, density }} />
      {copy.clockAction && (
        <kit.KitContent group="response" density={density}>
          <kit.KitLayoutText
            line={{ text: copy.verification, part: "verification", role: "meta", tone: "muted" }}
            density={density}
          />
          <kit.KitAction
            part="clock"
            kind={copy.breakElapsed ? "quiet" : input.on && copy.elapsed ? "secondary" : "primary"}
            label={copy.clockAction}
            full
          />
          {copy.breakAction && (
            <kit.KitAction
              part="break"
              kind={copy.breakElapsed ? "primary" : "quiet"}
              label={copy.breakAction}
              full
            />
          )}
        </kit.KitContent>
      )}
    </kit.KitCard>
  );
}

function ClockFigures({
  copy,
  density,
}: {
  copy: ReturnType<typeof timeClockDisplay>;
  density: c.ThemeDensity;
}) {
  return (
    <>
      {copy.breakElapsed ? (
        <kit.KitGrid density={density}>
          <kit.KitLayoutText
            line={{ text: copy.breakElapsed, part: "break_elapsed", role: "figure", tabular: true }}
            align="end"
            density={density}
            baseline
          />
          <kit.KitText part={null} role="number" density={density}>
            <kit.KitText part="break_elapsed_label" role="label" tone="muted" density={density}>
              {copy.breakElapsedLabel}
            </kit.KitText>
          </kit.KitText>
          <kit.KitLayoutText
            line={{ text: copy.elapsed, part: "elapsed", role: "figure", compact: true, tabular: true }}
            align="end"
            density={density}
          />
          <kit.KitLayoutText
            line={{ text: copy.elapsedLabel, part: "elapsed_label", role: "meta", tone: "muted" }}
            density={density}
          />
        </kit.KitGrid>
      ) : copy.elapsed ? (
        <kit.KitFigure
          value={{ text: copy.elapsed, part: "elapsed" }}
          unit={{ text: copy.elapsedLabel, part: "elapsed_label", role: "meta" }}
          density={density}
        />
      ) : null}
      <kit.KitLayoutText
        line={{ text: copy.breaks, part: "breaks", role: "meta", tone: "muted" }}
        density={density}
      />
    </>
  );
}
