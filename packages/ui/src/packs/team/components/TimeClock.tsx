import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { timeClockDisplay, timeClockPreview, timeClockReading } from "../copy";
import { teamWordsFor } from "../lang";

// Core first: Timer/up measures an activity but does not record clock-ins, clock-outs and breaks for work.
export const meta = {
  id: "TimeClock",
  status: "ready",
  group: "input",
  purpose: "Clock in and out of a work shift and record breaks.",
  pick: "Record work attendance with clock-in, clock-out and breaks for the current shift. Not a stopwatch or countdown for an activity (Timer), or approving a week's hours (Timesheet).",
  writeHints: [
    "on means clocked in. since is the local clock-in time if known; omit it when off. Do not write elapsed time or breaks.",
    'To hide only the clock-in timestamp, use {"detail":"brief"}; still keep the supplied since time. Use JSON null for any unrequested axis.',
  ],
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
  ],
  states: ["filled", "success"],
  actions: { parts: { clock: ["press"], break: ["press"] }, when: { break: { on: true } } },
  deviceData: ["shiftClock"],
  previewDeviceData: timeClockPreview,
  readSuccess: true,
  read: timeClockReading,
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  on: z.boolean(),
  since: c.clock.optional(),
  shift: c.text(28).optional(),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const [item] = c.itemsOf(cast, 1);
  return { on: false, shift: (item && c.titleOf(item, 28, c.thingOf(cast))) ?? c.placeholderTitle(0, lang) };
}

export const examples = [
  { on: true, since: "07:00", shift: "Morning greenhouse care" },
  { on: false, shift: "Afternoon park walks" },
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
] satisfies c.Probe[];

export function TimeClock(input: c.Props<typeof props, typeof meta>) {
  const state = kit.useComponentState();
  const { lang, words } = kit.useWords(teamWordsFor);
  const density = kit.useKit().density;
  const surface = "card";
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const copy = timeClockDisplay({ ...input, detail }, state, kit.useDeviceData(), lang, words.timeClock);
  const group = density === "compact" ? "content" : "response";
  const breaks = copy.breaks && (
    <kit.KitText part="breaks" role="label" tone="muted" density={density}>
      {copy.breaks}
    </kit.KitText>
  );
  return (
    <kit.KitCard part="root" padded {...{ density, surface }}>
      <kit.KitContent density={density}>
        <kit.KitText part="shift" role="heading" density={density}>
          {copy.shift}
        </kit.KitText>
        <kit.KitText
          part="status"
          role="label"
          tone={state === "success" ? "good" : "muted"}
          density={density}
        >
          {copy.status}
        </kit.KitText>
        {copy.since && (
          <kit.KitText part="since" role="label" tone="muted" density={density}>
            {copy.since}
          </kit.KitText>
        )}
        {!copy.elapsed && breaks}
      </kit.KitContent>
      {copy.elapsed && (
        <kit.KitContent group={group} density={density}>
          <kit.KitText part="elapsed" role="number" tabular density={density}>
            {copy.elapsed}
          </kit.KitText>
          <kit.KitText part="elapsed_label" role="label" tone="muted" density={density}>
            {copy.elapsedLabel}
          </kit.KitText>
          {breaks}
        </kit.KitContent>
      )}
      {copy.clockAction && (
        <kit.KitContent group="response" density={density}>
          <kit.KitAction
            part="clock"
            kind={input.on && copy.elapsed ? "secondary" : "primary"}
            label={copy.clockAction}
            full
          />
          {copy.breakAction && <kit.KitAction part="break" kind="quiet" label={copy.breakAction} full />}
        </kit.KitContent>
      )}
    </kit.KitCard>
  );
}
