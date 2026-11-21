import { expect, it, vi } from "vitest";
import { atDeviceTime, planAct, readScreen, writerFormatFor, type Definition } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { runProbes } from "..";
import {
  ballot,
  ballotFixture,
  closes,
  opens,
  quotes,
  refreshFixture,
  reportFixture,
  statement,
} from "./host-projections";

function fixture(def: Definition, id: string) {
  const defs = { [def.meta.id]: def };
  const screen = { id: "s", components: [{ ...(def.examples[0] as object), c: def.meta.id, id }] };
  return { defs, screen };
}

it("validates and stamps host-only report rows for both read and planAct", () => {
  const { defs, screen } = fixture(reportFixture, "r");
  const values = { "s/r/$deviceData": statement, "s/r/$rows": statement.accounts };
  const step = { address: "s/r/a2", action: "press" };
  const schema = writerFormatFor(reportFixture).json_schema.schema;
  expect(Object.keys(schema.properties ?? {})).toEqual(["c", "title"]);
  expect(reportFixture.props.safeParse({ title: "Spoof", rows: statement.accounts }).success).toBe(false);
  const hidden = readScreen(screen, defs, values);
  expect(hidden).toContain("0 lines");
  expect(hidden).not.toContain("Sales");
  expect(planAct(screen, defs, values, [step])).toMatchObject({ ok: false, code: "not_actionable" });
  expect(readScreen(screen, defs, values, undefined, statement).split("\n")).toEqual([
    "screen s",
    'r ReportFixture 2 lines — "Quarterly summary"',
    '  a1 "Sales" [r/a1 press→sales]',
    '  a2 "Costs \\"direct\\"" [r/a2 press→costs]',
  ]);
  expect(planAct(screen, defs, values, [step], null, "planner", statement)).toMatchObject({
    ok: true,
    links: [{ goto: "costs", address: "s/r/a2" }],
  });
  expect(
    planAct(screen, defs, values, [{ ...step, address: "r/injected-id" }], null, "planner", statement),
  ).toMatchObject({ ok: false, code: "not_actionable" });
  const controller = createScreenController({ screen, defs, deviceData: statement });
  expect(controller.canPress(step.address)).toBe(true);
  expect(controller.snapshotScreen()).toEqual(screen);
  expect(controller.liveControls(reportFixture.meta, {}, "r").rows).toMatchObject([
    { id: "a1", label: "Sales" },
    { id: "a2", label: 'Costs "direct"' },
  ]);
});

it("only offers vote writes to eligible viewers during the host window", () => {
  const { defs, screen } = fixture(ballotFixture, "b");
  const [entry] = screen.components;
  Object.assign(entry!, { options: [{ label: "Library", eligibleViewer: true }, { label: "Park" }] });
  const step = { address: "b/r1/vote", action: "press" };
  const values = { "s/b/$now": opens, "s/b/eligibleViewer": true, "s/b/inWindow": true };
  for (const [data, available] of [
    [atDeviceTime(ballot, opens - 1), false],
    [atDeviceTime(ballot, opens), true],
    [atDeviceTime(ballot, closes - 1), true],
    [atDeviceTime(ballot, closes), false],
    [atDeviceTime({ ...ballot, viewer: [{ eligible: false }] }, opens), false],
    [atDeviceTime({ ...ballot, viewer: [{ eligible: "true" }] }, opens), false],
    [atDeviceTime({ window: ballot.window }, opens), false],
    [atDeviceTime({ viewer: ballot.viewer }, opens), false],
  ] as const) {
    const reading = readScreen(screen, defs, values, undefined, data);
    expect(reading).toContain('"Library"');
    expect(reading.includes("[b/r1/vote press]")).toBe(available);
    const result = planAct(screen, defs, values, [step], null, "planner", data);
    if (available) expect(result).toMatchObject({ ok: true });
    else expect(result).toMatchObject({ ok: false, code: "not_actionable" });
  }
});

it("uses the mounted host clock for read and write, including confirming after closing", () => {
  const def = { ...ballotFixture, meta: { ...ballotFixture.meta, confirmParts: ["vote"] } };
  const { defs, screen } = fixture(def, "b");
  const onAction = vi.fn();
  let now = opens;
  const controller = createScreenController({ screen, defs, deviceData: ballot, now: () => now, onAction });
  expect(controller.read()).toContain("[b/r1/vote press]");
  expect(controller.press("b/r1/vote").ok).toBe(true);
  expect(controller.confirmation).toBeDefined();
  now = closes;
  expect(controller.press("confirm/confirm")).toMatchObject({ ok: false, code: "not_actionable" });
  expect(onAction).not.toHaveBeenCalled();
  expect(controller.press("confirm/cancel").ok).toBe(true);
  expect(controller.canPress("b/r1/vote")).toBe(false);
  expect(controller.read()).not.toContain("[b/r1/vote press]");
});

it("requires the declared refresh service and follows the current host attachment", () => {
  const { defs, screen } = fixture(refreshFixture, "q");
  const step = { address: "q/refresh", action: "press" };
  const values = { "s/q/$deviceData": quotes, "s/q/refreshAttached": true };
  for (const data of [undefined, { services: [{ id: "other" }] }, Object.create(quotes)]) {
    expect(readScreen(screen, defs, values, undefined, data)).not.toContain("q/refresh");
    expect(planAct(screen, defs, values, [step], null, "planner", data)).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
  }
  const onAction = vi.fn();
  let attached = true;
  const controller = createScreenController({
    screen,
    defs,
    onAction,
    get deviceData() {
      return attached ? quotes : undefined;
    },
  });
  expect(controller.read()).toContain("[q/refresh press !needs-service]");
  expect(controller.press(step.address).ok).toBe(true);
  attached = false;
  expect(controller.read()).not.toContain("q/refresh");
  expect(controller.act(step)).toMatchObject({ ok: false, code: "not_actionable" });
  expect(onAction).toHaveBeenCalledTimes(1);
});

it.each([
  [reportFixture, "[r/a2 press→costs]"],
  [ballotFixture, "[b/r2/vote press]"],
  [refreshFixture, "[q/refresh press !needs-service]"],
] as const)("seeds the $meta.id read probe from trusted preview data", async (def, offered) => {
  const [probe] = def.probes;
  const results = await runProbes({
    defs: [def],
    callModel: async (prompt) => {
      expect(prompt).toContain(offered);
      return JSON.stringify(probe!.expect);
    },
  });
  expect(results[0]?.status).toBe("pass");
});
