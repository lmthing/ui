import { expect, it } from "vitest";
import { z } from "zod";
import { planAct, readScreen, type Values } from "../../index";
import type { Definition } from "../../../probes";
import type { ClockSession } from "../../../meta";
import { atDeviceTime } from "../../device-data";

const startAt = Date.parse("2026-11-22T23:59:59Z");
const lapAt = startAt + 1200;
const end = startAt + 2700;
const data = { owners: ["first"], start: ["2026-11-23T00:59:59+01:00"] };
const meta = {
  id: "Journal",
  group: "input",
  purpose: "",
  pick: "",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "",
} as const;
const def: Definition = {
  props: z.strictObject({
    owner: z.string(),
    rows: z
      .array(
        z.strictObject({
          start: z.int(),
          end: z.int(),
          durationMs: z.int(),
          laps: z.array(z.int()),
          count: z.int(),
        }),
      )
      .max(1),
  }),
  meta: {
    ...meta,
    deviceData: ["owners"],
    actions: { parts: { timer: ["start", "stop"], lap: ["press"], reset: ["press"] } },
    clocks: [
      {
        id: "active",
        kind: "up",
        prop: "elapsed",
        start: { part: "timer", action: "start" },
        stop: { part: "timer", action: "stop" },
        reset: { part: "reset", action: "press" },
        journal: {
          rows: "rows",
          selection: ["owner"],
          lap: { part: "lap", max: 1, prop: "laps" },
          validTarget: ({ owner }, snapshot) => !!snapshot.owners?.includes(owner),
          record: (session: ClockSession) => session,
        },
      },
    ],
    read: (props) => {
      const { elapsed, laps, rows } = props as Values;
      return [`${elapsed}s ${JSON.stringify(laps)} ${JSON.stringify(rows)}`];
    },
  },
  fallback: () => ({ owner: "first", rows: [] }),
  examples: [],
  probes: [],
};
const screen = { id: "s", components: [{ id: "j", c: "Journal", owner: "first", rows: [] }] };
const defs = { Journal: def };
const start = { address: "j/timer", action: "start" };
const stop = { address: "j/timer", action: "stop" };
const lap = { address: "j/lap", action: "press" };

it("records one count-and-duration session over a week boundary and validates lap order, owner and capacity", () => {
  const started = planAct(screen, defs, {}, [start], null, "planner", data, startAt);
  if (!started.ok) throw new Error("Start should be available");
  expect(planAct(screen, defs, started.values, [lap, lap], null, "planner", data, lapAt)).toMatchObject({
    ok: false,
    at: 1,
  });
  const lapped = planAct(screen, defs, started.values, [lap], null, "planner", data, lapAt);
  if (!lapped.ok) throw new Error("Lap should be available");
  const read = readScreen(screen, defs, lapped.values, undefined, atDeviceTime(data, end));
  expect(read).toContain(`2s [${lapAt}] []`);
  expect(read).not.toContain("[j/lap press]");
  expect(planAct(screen, defs, lapped.values, [stop], null, "planner", { owners: [] }, end).ok).toBe(false);
  expect(planAct(screen, defs, lapped.values, [stop, stop], null, "planner", data, end)).toMatchObject({
    ok: false,
    at: 1,
  });
  const saved = planAct(screen, defs, lapped.values, [stop], null, "planner", data, end);
  if (!saved.ok) throw new Error("Stop should append one row");
  expect(readScreen(screen, defs, saved.values, undefined, atDeviceTime(data, end))).toContain(
    JSON.stringify([{ start: startAt, end, durationMs: 2700, laps: [lapAt], count: 1 }]),
  );
  const restarted = planAct(screen, defs, saved.values, [start], null, "planner", data, end + 100);
  if (!restarted.ok) throw new Error("Another session should start");
  expect(planAct(screen, defs, restarted.values, [stop], null, "planner", data, end + 500).ok).toBe(false);
});

it("reads elapsed time and an offset deadline from trusted records before any mount", () => {
  const passive: Definition = {
    ...def,
    meta: {
      ...meta,
      deviceData: ["start"],
      clocks: [
        {
          id: "elapsed",
          kind: "up",
          prop: "elapsed",
          timestamp: (records) => (typeof records.start?.[0] === "string" ? records.start[0] : undefined),
        },
        { id: "deadline", kind: "until", prop: "remaining", timestamp: () => "2026-11-23T01:00:05+01:00" },
      ],
      read: (props) => [`${(props as Values).elapsed}s ${(props as Values).remaining}ms`],
    },
  };
  expect(readScreen(screen, { Journal: passive }, {}, undefined, atDeviceTime(data, end))).toContain(
    "2s 3300ms",
  );
});
