import { z } from "zod";
import { text, type ClockMeta, type Definition, type Meta, type Values } from "@lmthing/ui/catalog";
import { createAgentAccess, createScreenController } from "@lmthing/ui/kit";

const base: Meta = {
  id: "ClockFixture",
  group: "data",
  purpose: "Read clocks",
  pick: "Read clocks",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Local clocks",
  states: ["filled", "success"],
};
export const clock: ClockMeta = {
  id: "clock",
  kind: "down",
  from: "seconds",
  prop: "remaining",
  start: { part: "begin", action: "start" },
  stop: { part: "end", action: "stop" },
  reset: { part: "reset", action: "press" },
};
const actions = { begin: ["start"], end: ["stop"], reset: ["press"] } as const;
const seconds = z.int().min(0).max(86400);
export const single: Definition = {
  meta: {
    ...base,
    clocks: [clock],
    parts: ["root", "begin", "end", "reset"],
    actions: { parts: actions },
    read: (input) => [`remaining ${String((input as Values).remaining)}`],
  },
  props: z.strictObject({ seconds, remaining: seconds.optional() }),
  fallback: () => ({ seconds: 0 }),
  examples: [],
  probes: [],
};
export const multiple: Definition = {
  ...single,
  meta: {
    ...base,
    items: {
      key: "timers",
      parts: ["root", "begin", "end", "reset"],
      clocks: [{ ...clock, zero: { prop: "finished", value: true } }],
    },
    actions: { items: actions },
    read: (input) =>
      (input as { timers: Values[] }).timers.map(
        (item) => `${String(item.label)} ${String(item.remaining)} ${String(item.finished)}`,
      ),
  },
  props: z.strictObject({
    timers: z
      .array(
        z.strictObject({
          label: text(20),
          seconds,
          remaining: seconds.optional(),
          finished: z.boolean().default(false),
        }),
      )
      .min(1)
      .max(6),
  }),
  fallback: () => ({ timers: [] }),
};
export const nested: Definition = {
  ...single,
  meta: {
    ...base,
    clocks: [
      {
        id: "session",
        kind: "up",
        prop: "elapsed",
        stop: { part: "finish", action: "press", state: "success" },
      },
    ],
    parts: ["root", "rest", "finish"],
    actions: {
      parts: { rest: ["stop"], finish: ["press"] },
      items: {
        rest_1: ["stop"],
        rest_2: ["stop"],
        reset_1: ["press"],
        reset_2: ["press"],
      },
    },
    items: {
      key: "groups",
      parts: ["root"],
      nested: {
        key: "sets",
        parts: { done: { action: "toggle", prop: "done" } },
        clocks: [
          {
            id: "rest",
            kind: "down",
            from: "rest",
            prop: "remaining",
            start: { part: "done", action: "toggle", value: true },
            stop: { part: "rest", action: "stop" },
            reset: { part: "reset", action: "press" },
          },
          {
            id: "shared",
            kind: "down",
            from: "rest",
            prop: "shared",
            start: { part: "done", action: "toggle", value: true },
            stop: { part: "rest", action: "stop", scope: "component" },
          },
        ],
      },
    },
    read: (input) => {
      const value = input as { elapsed: number; groups: { sets: Values[] }[] };
      return [
        `elapsed ${value.elapsed}`,
        ...value.groups.flatMap((row) =>
          row.sets.map((set) => `rest ${String(set.remaining)} ${String(set.done)}`),
        ),
      ];
    },
  },
  props: z.strictObject({
    rest: seconds.default(90),
    elapsed: seconds.optional(),
    groups: z
      .array(
        z.strictObject({
          sets: z
            .array(
              z.strictObject({
                done: z.boolean().default(false),
                remaining: seconds.optional(),
                shared: seconds.optional(),
              }),
            )
            .min(1)
            .max(6),
        }),
      )
      .min(1)
      .max(8),
  }),
  fallback: () => ({ groups: [] }),
};
export function setup(def: Definition, props: Values) {
  let time = 1000;
  const screen = { id: "test", components: [{ id: "f1", c: def.meta.id, ...props }] };
  const defs = { [def.meta.id]: def };
  const runtime = createScreenController({ screen, defs, now: () => time });
  const agent = createAgentAccess({ defs, store: runtime.store, current: () => screen, runtime });
  return {
    runtime,
    agent,
    advance: (ms: number, tick = true) => {
      time += ms;
      if (tick) runtime.tick();
    },
    live: () => runtime.snapshotScreen().components[0]!,
  };
}
