import { describe, expect, it, vi } from "vitest";
import { affordancesOf, components, readComponent, stampItemIds } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance } from "../../../../../test/render";

const def = components.Routines;
const { meta, props, fallback, examples, probes } = def;
const rules = examples[0]!;
const activity = examples[1]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const render = (input: unknown, state: (typeof meta.states)[number] = "filled") =>
  renderInstance("Routines", input, state, theme, { component: "r1", thing: "routine" });
const row = rules.routines[0]!;
const offers = (input: unknown, state: (typeof meta.states)[number] = "filled") =>
  affordancesOf(meta, stampItemIds(meta, props.parse(input)), "r1", {}, state).map(({ address }) => address);

describe("Routines contract and fallback", () => {
  it.each(examples)("accepts realistic examples", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it.each(
    [
      [],
      Array.from({ length: 7 }, (_, n) => ({ ...row, id: `routine_${n}` })),
      [row, row],
      [{ ...row, id: "x".repeat(25) }],
      [{ ...row, name: "x".repeat(29) }],
      [{ ...row, triggerKind: "manual" }],
      [{ ...row, triggerSummary: "x".repeat(37) }],
      [{ ...row, actionsSummary: "x".repeat(49) }],
      [{ ...row, enabled: "true" }],
      [{ ...row, lastRun: "2026-11-20T07:00:00" }],
      [{ ...row, lastRun: "2026-02-30T07:00:00Z" }],
      [{ ...row, goto: "Bad ID" }],
      [{ ...row, linked: true }],
      [{ ...row, color: "red" }],
    ].map((routines) => ({ routines })),
  )("rejects out-of-contract rule data", ({ routines }) => {
    expect(props.safeParse({ routines }).success).toBe(false);
  });
  it("accepts exact count and strength limits and rejects unknown style or raw layout props", () => {
    const routines = Array.from({ length: 6 }, (_, n) => ({
      ...row,
      id: `${"x".repeat(23)}${n}`,
      name: "x".repeat(28),
      triggerSummary: "x".repeat(36),
      actionsSummary: "x".repeat(48),
    }));
    expect(props.parse({ routines })).toMatchObject({ style: "rules" });
    expect(props.safeParse({ routines, style: "history" }).success).toBe(false);
    expect(props.safeParse({ routines, color: "red" }).success).toBe(false);
  });
  it("uses a cast title and detail, or a neutral disabled seed with no fictional run", () => {
    const from = (name?: unknown, room?: unknown) =>
      props.parse(
        fallback({
          cast: {
            things: [{ type: "plant", fields: ["name", "room"] }],
            items: name === undefined ? [] : [{ id: "fern", type: "plant", sample: true, name, room }],
          },
        }),
      ).routines[0];
    expect(from("Fern", "Hall")).toMatchObject({ name: "Fern", triggerSummary: "Hall", enabled: false });
    expect(from()).toMatchObject({ name: "Item one", enabled: false });
    expect(from(4, null)?.lastRun).toBeUndefined();
    expect(from(4, null)?.name).toBe("Item one");
    expect(meta.tier).toBe("service");
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Field" }));
    expect(probes.some((probe) => probe.kind === "write" && probe.variant?.axis === "detail")).toBe(true);
  });
});

describe("Routines states and parts", () => {
  it("stamps each offered action once with an isolated link, switch or button role", () => {
    const html = render(rules);
    expect(offers(rules)).toEqual(["r1/r1", "r1/r1/enabled", "r1/r1/run", "r1/r2/enabled", "r1/r2/run"]);
    expect(elementAt(html, "home/r1/r1/root").attributes).toContain('role="link"');
    expect(elementAt(html, "home/r1/r1/enabled").attributes).toContain('role="switch"');
    expect(elementAt(html, "home/r1/r1/run").attributes).toContain('role="button"');
    for (const address of offers(rules)) {
      const part = address.split("/").length === 2 ? `${address}/root` : address;
      expect(html.split(`data-testid="home/${part}"`)).toHaveLength(2);
    }
  });
  it("shows true empty, loading, acknowledgement and offline states without accidental controls", () => {
    expect(render(rules, "empty")).toContain("No routines yet");
    expect(render(rules, "loading")).not.toMatch(/role="(link|switch|button)"/);
    expect(render(rules, "success")).toContain("Routine command acknowledged");
    const offline = render(rules, "error");
    expect(offline).toContain("Couldn’t complete the routine command");
    expect(elementAt(offline, "home/r1/r1/run").attributes).toContain('aria-disabled="true"');
    expect(elementAt(offline, "home/r1/r1/enabled").attributes).toContain('aria-disabled="true"');
    expect(offline).not.toContain('role="link"');
    for (const state of ["empty", "loading", "error"] as const) expect(offers(rules, state)).toEqual([]);
    expect(offers(rules, "success")).toEqual(offers(rules));
  });
  it("orders activity by last run while keeping addressed rows and hides only the brief summary", () => {
    const input = { ...activity, routines: [...activity.routines].reverse() };
    const html = render(input);
    expect(html.indexOf("home/r1/r2/root")).toBeLessThan(html.indexOf("home/r1/r1/root"));
    expect(html).toContain("Last run: 20 Nov 2026 · 10:20");
    expect(html).not.toContain("When I arrive home");
    expect(render({ ...input, detail: "brief" })).not.toContain("Turn on the hall light");
    expect(offers({ ...input, detail: "brief" })).toEqual(offers(input));
    const read = readComponent(def, { ...input, detail: "brief" }, "r1").join("\n");
    expect(read).toContain("r2 · Back from a walk · Last run: 20 Nov 2026 · 10:20");
    expect(read).not.toContain("Turn on the hall light");
  });
});

describe("Routines read and act", () => {
  it("runs locally addressed commands without navigating or faking last-run data, and opens only real links", () => {
    const onAction = vi.fn(),
      onLink = vi.fn();
    const screen = { id: "home", components: [{ id: "r1", c: "Routines", ...rules }] };
    const runtime = createScreenController({ screen, defs: components, onAction, onLink });
    const run = { address: "r1/r1/run", action: "press" };
    const toggle = { address: "r1/r2/enabled", action: "toggle" };
    expect(runtime.read()).toContain("[r1/r2/enabled toggle:off !needs-service]");
    expect(runtime.act(toggle).ok).toBe(true);
    expect(runtime.read()).toContain("[r1/r2/enabled toggle:on !needs-service]");
    expect(runtime.act(toggle).ok).toBe(true);
    expect(runtime.read()).toContain("[r1/r2/enabled toggle:off !needs-service]");
    expect(runtime.act({ ...run, address: "r1/r2/run" }).ok).toBe(true);
    expect(runtime.read()).toContain("Not run yet");
    expect(runtime.act(run).ok).toBe(true);
    expect(onAction).toHaveBeenLastCalledWith({ ...run, address: "home/r1/r1/run" });
    expect(onLink).not.toHaveBeenCalled();
    expect(runtime.act({ ...run, address: "r1/r2" }).ok).toBe(false);
    expect(runtime.act({ ...run, address: "r1/r1" }).ok).toBe(true);
    expect(onLink).toHaveBeenCalledExactlyOnceWith("grow_lights", "home/r1/r1");
    runtime.dispose();
  });
});
