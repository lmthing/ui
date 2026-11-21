import { z } from "zod";
import * as c from "../../../catalog";
import { homeTimestamp } from "../copy";

// Core first: Field/repeat stores a repeat value, not trigger rules that run connected device commands.
export const meta = {
  id: "Routines",
  status: "draft",
  group: "input",
  purpose: "Manage smart-home rules that run connected devices when their triggers occur.",
  pick: "Automatic smart-home rules with trigger conditions, device actions, enable switches and manual runs. Not manual scenes (Devices), household chores (Chores, CareSchedule), or a repeat value in a form (Field).",
  region: "body",
  weight: 2,
  tier: "service",
  realPath:
    "A connected smart-home automation service saves trigger rules and runs device commands through the host adapter.",
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
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    routines: z
      .array(
        z.strictObject({
          id: c.text(24).meta({ kind: "id", max: 24 }),
          name: c.text(28),
          triggerKind: z.enum(["schedule", "sunrise_sunset", "arrival", "sensor"]),
          triggerSummary: c.text(36),
          actionsSummary: c.text(48),
          enabled: z.boolean(),
          lastRun: homeTimestamp.optional(),
          goto: c.screenId.optional(),
        }),
      )
      .min(1)
      .max(6),
    style: z.enum(["rules", "activity"]).default("rules"),
  })
  .refine(
    ({ routines }) => new Set(routines.map(({ id }) => id)).size === routines.length,
    "Routine ids must be unique",
  )
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
export const probes = [
  choose(
    "Manage automatic smart-home rules: switch grow lights on every morning, run a fan above 70% humidity, and let me pause or run each rule now.",
  ),
  choose(
    "I need just one form input labelled Water it, set to repeat every week. It stores a preference, no connected device or automatic action.",
    "Field",
  ),
  write(
    "A smart-home rule with id grow_lights named Morning grow lights. Every day at 07:00, switch on the plant shelf lights. Enable it.",
  ),
  read("Run Morning grow lights right now without opening its details.", {
    address: "r1/r1/run",
    action: "press",
  }),
] satisfies c.Probe[];
