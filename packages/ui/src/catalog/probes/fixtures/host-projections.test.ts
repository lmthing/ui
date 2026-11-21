import { expect, it, vi } from "vitest";
import { atDeviceTime, planAct, readScreen, writerFormatFor, type Definition } from "@lmthing/ui/catalog";
import { createAgentAccess, createInteractionStore, createScreenController } from "@lmthing/ui/kit";
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

it("passes projected row values through mounted selection", () => {
  const def: Definition = {
    ...reportFixture,
    meta: {
      ...reportFixture.meta,
      items: { ...reportFixture.meta.items!, prefix: "l" },
      select: { prop: "selected", value: { field: "label" } },
      actions: { items: { root: ["select"] } },
    },
  };
  const { defs, screen } = fixture(def, "r");
  const onAction = vi.fn();
  const controller = createScreenController({ screen, defs, deviceData: statement, onAction });
  expect(controller.read()).toContain("[r/l2 select");
  expect(controller.act({ address: "r/l2", action: "select" }).ok).toBe(true);
  expect(onAction).toHaveBeenCalledWith({ address: "s/r/l2", action: "select" });
  expect(controller.store.get("s/r/$selected")).toBe('Costs "direct"');
  expect(controller.snapshotScreen()).toEqual(screen);
});

it("uses the mounted host clock to hide an expired confirmation and reject the write", () => {
  const def = { ...ballotFixture, meta: { ...ballotFixture.meta, confirmParts: ["vote"] } };
  const { defs, screen } = fixture(def, "b");
  const onAction = vi.fn();
  let now = opens;
  const controller = createScreenController({ screen, defs, deviceData: ballot, now: () => now, onAction });
  expect(controller.read()).toContain("[b/r1/vote press]");
  expect(controller.press("b/r1/vote").ok).toBe(true);
  expect(controller.confirmation).toBeDefined();
  now = closes;
  expect(controller.read()).not.toContain("[confirm/confirm press]");
  expect(controller.canPress("confirm/confirm")).toBe(false);
  expect(controller.press("confirm/confirm")).toMatchObject({ ok: false, code: "not_actionable" });
  expect(onAction).not.toHaveBeenCalled();
  expect(controller.canPress("b/r1/vote")).toBe(false);
  expect(controller.read()).not.toContain("[b/r1/vote press]");
  controller.dispose();
});

it("refreshes mounted subscribers exactly at ballot boundaries without saving the clock", () => {
  vi.useFakeTimers({ now: opens - 1 });
  const { defs, screen } = fixture(ballotFixture, "b");
  const controller = createScreenController({ screen, defs, deviceData: ballot });
  const visible: boolean[] = [];
  const unsubscribe = controller.store.subscribe(() => visible.push(controller.canPress("b/r1/vote")));
  try {
    controller.mount();
    expect(controller.canPress("b/r1/vote")).toBe(false);
    vi.advanceTimersByTime(1);
    expect(visible).toEqual([false, true]);
    vi.advanceTimersByTime(closes - opens);
    expect(visible).toEqual([false, true, false]);
    expect(controller.store.snapshot()).toEqual({});
  } finally {
    unsubscribe();
    controller.dispose();
    vi.useRealTimers();
  }
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

it("rechecks the live clock on detached agent actions", () => {
  const { defs, screen } = fixture(ballotFixture, "b");
  const store = createInteractionStore({ "s/b/$now": opens });
  const agent = createAgentAccess({ defs, store, current: () => screen, deviceData: ballot });
  const step = { address: "b/r1/vote", action: "press" };
  const now = vi.spyOn(Date, "now").mockReturnValue(opens);
  try {
    expect(agent.act(step, { dryRun: true }).ok).toBe(true);
    now.mockReturnValue(closes);
    expect(agent.read()).not.toContain("[b/r1/vote press]");
    expect(agent.act(step)).toMatchObject({ ok: false, code: "not_actionable" });
  } finally {
    now.mockRestore();
  }
});
