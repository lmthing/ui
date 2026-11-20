import { z } from "zod";
import { clockLine, probesFor, text, variantProps } from "../../../catalog";
import type { ClockState, FallbackInput, Meta, Probe, Props } from "../../../catalog";
import * as kit from "../../../kit";
import { indexedParts, seedTitles } from "..";
import { activeWorkoutRest, hasWorkoutSetFields, workoutReading, workoutSetLabel } from "../copy";
import { healthWordsFor } from "../lang";

const setFields = { prop: "hasFields", equals: true } as const;
export const meta = {
  id: "Workout",
  status: "ready",
  group: "input",
  purpose: "Log each exercise's sets, weight and reps during one workout.",
  pick: "Logging a workout set by set, editing weight and reps, ticking sets and resting between them. Not ordinary jobs to tick (Checklist), timing one activity (Timer), or a run on a route (Route).",
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Exercise sets stored on the device; this is a log, not medical advice.",
  writeHints: [
    "Write surface null unless asked for an outline; never write the default surface card. Use detail brief only when asked to hide the elapsed-time header. Keep set controls and rest.",
  ],
  variants: { surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["time"] } },
  // prettier-ignore
  clocks: [{
    id: "session", kind: "up", prop: "elapsed", max: 86400,
    stop: { part: "finish", action: "press", state: "success" },
  }],
  items: {
    key: "exercises",
    parts: [
      "root",
      "name",
      ...indexedParts(6, ["set", "label", "weight", "reps", "done", "remaining"]),
      ...indexedParts(6, ["weight", "reps"]).map((part) => `${part}_label`),
    ],
    nested: {
      key: "sets",
      parts: {
        done: { action: "toggle", prop: "done" },
        weight: { action: "set", prop: "weight", min: 0, max: 1000, when: setFields },
        reps: { action: "set", prop: "reps", min: 0, max: 999, integer: true, when: setFields },
      },
      // prettier-ignore
      clocks: [{
        id: "rest", kind: "down", from: "rest", prop: "remaining", zero: "stop",
        start: { part: "done", action: "toggle", value: true },
        stop: { part: "rest", action: "stop", scope: "component" },
      }],
    },
  },
  parts: ["root", "time", "rest", "rest_label", "finish", "finish_label", "title", "sub"],
  states: ["filled", "empty", "success"],
  actions: {
    parts: { rest: ["stop"], finish: ["press"] },
    when: { rest: { hasRest: true } },
  },
  read: (input, state, lang): string[] =>
    state === "filled" ? workoutReading(input as z.output<typeof props>, lang) : [],
} as const satisfies Meta;

// prettier-ignore
const setProps = z.strictObject({
  weight: z.number().min(0).max(1000).optional(),
  reps: z.int().min(0).max(999).optional(),
  seconds: z.int().min(0).max(86400).optional(),
  done: z.boolean(),
  remaining: z.int().min(0).max(600).optional(),
}).overwrite((set) => ({ ...set, hasFields: hasWorkoutSetFields(set) }));
// prettier-ignore
export const props = z.strictObject({
    ...variantProps(meta.variants),
    exercises: z.array(z.strictObject({ name: text(28), sets: z.array(setProps).min(1).max(6) })).min(1).max(8),
    rest: z.int().min(0).max(600).default(90),
    unit: z.enum(["kg", "lb"]).default("kg"),
    elapsed: z.int().min(0).max(86400).optional(),
  })
  .overwrite((value) => ({ ...value, hasRest: value.rest > 0 }));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  return {
    exercises: seedTitles(cast, 2, 28, lang).map((name) => ({
      name,
      sets: [{ weight: 0, reps: 0, done: false }],
    })),
  };
}
// prettier-ignore
export const examples = [
  {
    exercises: [
      { name: "Bench press", sets: [
        { weight: 40, reps: 8, done: false }, { weight: 40, reps: 8, done: false },
      ] },
      { name: "Plank", sets: [{ seconds: 45, done: true }] },
    ],
    rest: 0, unit: "kg", elapsed: 185,
  },
  {
    exercises: [{ name: "Goblet squat", sets: [
      { weight: 25, reps: 12, done: true, remaining: 36 }, { weight: 25, reps: 10, done: false },
    ] }],
    rest: 60, unit: "lb", elapsed: 125, detail: "brief",
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Workout");
export const probes = [
  choose("Log a strength session, entering the weight and reps for each set and ticking it before resting"),
  choose(
    "Tick off today's three jobs: stretch, walk and drink water, with no sets or numeric inputs",
    "Checklist",
  ),
  write("Log bench press, two sets of 40 kg for 8 reps, neither done, with 90 seconds rest"),
  {
    ...write(
      "Log bench press, two sets of 40 kg for 8 reps, neither done, with 90 seconds rest and 185 seconds elapsed. Keep the elapsed value in the data, but hide the elapsed-time header; keep the sets and Finish workout.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Mark the first bench press set as done", { address: "w1/r1/done_1", action: "toggle" }),
  read("Change the second bench press set's weight to 45 kg", { address: "w1/r1/weight_2", action: "set" }),
] satisfies Probe[];

type WorkoutProps = Props<typeof props, typeof meta>;
type Set = WorkoutProps["exercises"][number]["sets"][number];
type SetProps = { item: string; set: Set; pos: number; unit: WorkoutProps["unit"]; stop: boolean };
function WorkoutSet({ item, set, pos, unit, stop }: SetProps) {
  const { lang, words } = kit.useWords(healthWordsFor);
  const { item: _item, ...scope } = kit.usePartContext();
  const w = words.workout;
  const label = workoutSetLabel(pos, set.seconds, lang);
  const limits = [
    { name: "weight", label: w.weight(w.units[unit]), max: 1000 },
    { name: "reps", label: w.reps, max: 999, step: 1 },
  ] as const;
  const fields = limits.map(({ name, label, ...bounds }) => {
    const id = `${name}_${pos}`;
    const input = { part: id, label, hint: "", value: set[name]?.toString(), min: 0, ...bounds };
    return { id, label, control: <kit.KitInput kind="number" action="set" compact {...input} /> };
  });
  const rest = (stop || set.done) && set.remaining ? w.remaining(clockLine(set.remaining, lang)) : undefined;
  const done = <kit.KitCheck part={`done_${pos}`} done={set.done} label={w.completeSet(label)} />;
  const row = { item, part: `set_${pos}`, label };
  const labelPart = `label_${pos}`;
  // prettier-ignore
  const detail = rest && <kit.KitRow label={rest} inline trailing={stop && <kit.PartContext.Provider value={scope}>
    <kit.KitAction part="rest" action="stop" kind="quiet" label={w.stopRest} />
  </kit.PartContext.Provider>}>
    <kit.KitText part={`remaining_${pos}`} role="number" numberScale="compact" tabular>{rest}</kit.KitText>
  </kit.KitRow>;
  // prettier-ignore
  return hasWorkoutSetFields(set)
    ? <kit.KitSetRow {...row} labelPart={labelPart} fields={fields} done={done} detail={detail} />
    : <><kit.KitRow {...row} inline lineRole="label" trailing={done}>
        <kit.KitText part={labelPart} role="label">{label}</kit.KitText>
      </kit.KitRow>{detail}</>;
}

export function Workout({ exercises, unit, rest, elapsed, surface, detail }: WorkoutProps) {
  const full = kit.useVariant("detail", meta.variants.detail, detail) === "full";
  const state = kit.useComponentState();
  const { controller } = kit.useKit();
  const { screen, component } = kit.usePartContext();
  const { lang, words } = kit.useWords(healthWordsFor);
  const w = words.workout;
  const time = clockLine(elapsed ?? 0, lang);
  const running =
    controller &&
    ((id: string, pos: number) =>
      (controller.store.get(`${screen}/${component}/${id}/$rest_${pos}`) as ClockState | undefined)
        ?.running === true);
  const restAt = rest > 0 && activeWorkoutRest(exercises, running);
  // prettier-ignore
  return (
    <kit.KitCard style="inset" part="root" padded surface={surface}>
      {state === "empty" ? (
        <kit.KitEmpty decorativeIcon />
      ) : state === "success" ? (
        <kit.KitEmpty icon="check" tone="good" title={w.success} sub={w.timeLine(time)} decorativeIcon />
      ) : (
        <>
          {full && <kit.KitContent>
            <kit.KitText part={null} role="caption" tone="muted">{w.elapsed}</kit.KitText>
            <kit.KitText part="time" role="number" numberScale="compact" tabular>{time}</kit.KitText>
          </kit.KitContent>}
          {exercises.map(({ id, name, sets }) => (
            <kit.KitRow key={id} item={id} label={name} inset="none">
              <kit.KitText part="name" role="number" numberScale="compact">{name}</kit.KitText>
              {sets.map((set, at) => <WorkoutSet key={at} item={id} set={set} unit={unit}
                pos={at + 1} stop={Boolean(restAt && restAt.id === id && restAt.pos === at + 1)} />)}
            </kit.KitRow>
          ))}
          <kit.KitAction part="finish" label={w.finish} full />
        </>
      )}
    </kit.KitCard>
  );
}
