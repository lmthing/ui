import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { homeTimestamp, routineLastRun, routineOrder, routineReading, routineTriggerParts } from "../copy";
import { homeWordsFor } from "../lang";

// Core first: Field/repeat stores a repeat value, not trigger rules that run connected device commands.
// prettier-ignore
export const meta = {
  id: "Routines",
  status: "ready",
  group: "input",
  purpose: "Manage smart-home rules that run connected devices when their triggers occur.",
  pick: "Automatic smart-home rules with trigger conditions, device actions, enable switches and manual runs. Not manual scenes (Devices), household chores (Chores, CareSchedule), or a repeat value in a form (Field).",
  writeHints: [
    'If asked to hide device action summaries, set detail to "brief". Use JSON null for density and surface unless requested; do not fill in defaults.',
    'Optional lastRun is an observed ISO timestamp with an offset, e.g. "2026-11-20T07:00:00+00:00"; omit it when unknown.',
  ],
  region: "body",
  weight: 2,
  tier: "service",
  realPath:
    "A connected smart-home automation service saves trigger rules and runs device commands through the host adapter.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["summary"] } },
  parts: ["root", "heading", "empty", "feedback"],
  items: {
    key: "routines",
    parts: ["root", "name", "trigger", "summary", "last", "enabled", "run", "run_label", "trail"],
  },
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    items: { root: ["press"], enabled: ["toggle"], run: ["press"] },
    when: { root: { linked: true } },
    noGoto: { items: ["run"] },
  },
  successActions: ["root.press", "enabled.toggle", "run.press"],
  readSuccess: true,
  read: routineReading,
} as const satisfies c.Meta;

const summaryText = (max: number) => c.text(max).meta({ kind: "summary", max });
// prettier-ignore
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    routines: z.array(z.strictObject({
      id: c.text(24).meta({ kind: "id", max: 24 }), name: c.text(28),
      triggerKind: z.enum(["schedule", "sunrise_sunset", "arrival", "sensor"]),
      triggerSummary: summaryText(36), actionsSummary: summaryText(48),
      enabled: z.boolean(), lastRun: homeTimestamp.optional(), goto: c.screenId.optional(),
    })).min(1).max(6),
    style: z.enum(["rules", "activity"]).default("rules"),
  })
  .refine(({ routines }) => new Set(routines.map(({ id }) => id)).size === routines.length, "Routine ids must be unique")
  .overwrite(({ routines, ...input }) => ({
    ...input,
    routines: routines.map((row) => ({ ...row, linked: row.goto !== undefined })),
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3);
  const words = c.wordsFor(lang);
  return {
    routines: (items.length ? items : [undefined]).map((item, index) => ({
      id: `routine_${index + 1}`,
      name: (item && c.titleOf(item, 28, thing)) || c.placeholderTitle(index, lang),
      triggerKind: "schedule",
      triggerSummary: (item && c.detailOf(item, 36, thing)) || words.placeholderDetail,
      actionsSummary: words.placeholderValue,
      enabled: false,
    })),
  };
}

// prettier-ignore
export const examples = [
  { routines: [
    { id: "grow_lights", name: "Morning grow lights", triggerKind: "schedule", triggerSummary: "Every day at 07:00",
      actionsSummary: "Switch on the plant shelf lights", enabled: true,
      lastRun: "2026-11-20T07:00:00+00:00", goto: "grow_lights" },
    { id: "greenhouse_fan", name: "Vent the greenhouse", triggerKind: "sensor", triggerSummary: "Humidity above 70%",
      actionsSummary: "Switch on the extractor fan", enabled: false },
  ] },
  { style: "activity", routines: [
    { id: "return", name: "Back from a walk", triggerKind: "arrival", triggerSummary: "When I arrive home",
      actionsSummary: "Turn on the hall light", enabled: true, lastRun: "2026-11-20T10:20:00+00:00" },
    { id: "sunset", name: "Evening dog check", triggerKind: "sunrise_sunset", triggerSummary: "At sunset",
      actionsSummary: "Turn on the garden light", enabled: true, lastRun: "2026-11-19T17:45:00+00:00" },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Routines");
// prettier-ignore
export const probes = [
  choose("Manage automatic smart-home rules: switch grow lights on every morning, run a fan above 70% humidity, and let me pause or run each rule now."),
  choose("I need just one form input labelled Water it, set to repeat every week. It stores a preference, no connected device or automatic action.", "Field"),
  write("A smart-home rule with id grow_lights named Morning grow lights. Every day at 07:00, switch on the plant shelf lights. Enable it."),
  {
    ...write("Show my enabled Morning grow lights automatic rule, id grow_lights, every day at 07:00 to switch on plant shelf lights. Hide the device action summary from the list; leave spacing and borders alone."),
    variant: { axis: "detail", value: "brief" },
  },
  read("Run Morning grow lights right now without opening its details.", { address: "r1/r1/run", action: "press" }),
  read("Enable the automation that vents the greenhouse.", { address: "r1/r2/enabled", action: "toggle" }),
  read("Open the Morning grow lights rule details, without running it.", { address: "r1/r1", action: "press" }),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;
type Routine = View["routines"][number];
type Density = "comfortable" | "compact";
const icons = { schedule: "clock", sunrise_sunset: "sun", arrival: "pin", sensor: "thermometer" } as const;

// prettier-ignore
function RoutineRow({ row, style, detail, density }: Pick<View, "style" | "detail"> & { row: Routine; density: Density }) {
  const { lang, words: { routines: w } } = kit.useWords(homeWordsFor);
  const state = kit.useComponentState();
  const loading = state === "loading", disabled = loading || state === "error";
  const trigger = style === "rules" ? w.trigger(row.triggerSummary) : undefined;
  const summary = detail === "full" ? w.action(row.actionsSummary) : undefined;
  const last = routineLastRun(row.lastRun, lang);
  const lines: [kit.TextRole, string | undefined][] = [["heading", row.name]];
  if (style === "activity") lines.push(["label", last]);
  if (trigger) lines.push(["body", trigger]);
  if (summary) lines.push(["body", summary]);
  if (style === "rules") lines.push(["label", last]);
  const lastLine = <kit.KitText role="label" tone="muted" part="last">{last}</kit.KitText>;
  const lead = !loading && <kit.KitIcon name={icons[row.triggerKind]} tone="muted" decorative />;
  return <kit.KitRow item={row.id} part={null} label={row.name} leading={lead} lineRole="heading" {...{ density }}>
    <kit.KitContent {...{ density }}>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" lead="dot" content={lines} {...{ density }} /> :
        <kit.KitRow part="root" label={row.name} goto={disabled ? undefined : row.goto} inline lineRole="heading"
          trailing={!disabled && row.goto && <kit.KitTrail kind="chevron" />}>
          <kit.KitContent {...{ density }}>
            <kit.KitText role="heading" part="name" {...{ density }}>{row.name}</kit.KitText>
            {style === "activity" && lastLine}
            {trigger && <kit.KitText role="body" part="trigger" {...{ density }}>{routineTriggerParts(trigger).map((text, i) =>
              i % 2 ? <kit.KitText key={i} part={null} role="number" numberScale="compact" tabular>{text}</kit.KitText> : text)}</kit.KitText>}
            {summary && <kit.KitText role="body" part="summary" tone="muted" {...{ density }}>{summary}</kit.KitText>}
            {style === "rules" && lastLine}
          </kit.KitContent>
        </kit.KitRow>}
      <kit.KitGrid fitLast {...{ density }}>
        <kit.KitRow part={null} label={w.automatic} inline
          trailing={<kit.KitTrail kind="toggle" part="enabled" label={w.enabled(row.name)} on={row.enabled} {...{ disabled }} />}>
          {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["label", w.automatic]]} />
            : <kit.KitText role="label" part={null} tone="muted">{w.automatic}</kit.KitText>}
        </kit.KitRow>
        <kit.KitAction part="run" kind="secondary" label={w.run} {...{ disabled }} />
      </kit.KitGrid>
    </kit.KitContent>
  </kit.KitRow>;
}

// prettier-ignore
export function Routines(input: View) {
  const { words: { routines: w } } = kit.useWords(homeWordsFor);
  const state = kit.useComponentState();
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const title = w[input.style];
  return <kit.KitCard part="root" {...{ density, surface }}>
    {state === "empty" ? <kit.KitEmpty icon="zap" part="empty" decorativeIcon /> :
      <kit.KitContent {...{ density }}>
        <kit.KitRow part={null} label={title} {...{ density }}>
          <kit.KitContent {...{ density }}>
            {state === "loading" ? <kit.KitSkeleton shape="figure" inset="none" content={[["title", title]]} /> :
              <kit.KitText role="title" part="heading" {...{ density }}>{title}</kit.KitText>}
            {(state === "success" || state === "error") &&
              <kit.KitText role="label" tone={state === "success" ? "good" : "bad"} part="feedback">{w[state]}</kit.KitText>}
          </kit.KitContent>
        </kit.KitRow>
        <kit.KitGrid list arrange="rows" listRowGap="group" {...{ density }}>
          {routineOrder(input.routines, input.style).map((row) =>
            <RoutineRow key={row.id} {...{ row, detail, density }} style={input.style} />)}
        </kit.KitGrid>
      </kit.KitContent>}
  </kit.KitCard>;
}
