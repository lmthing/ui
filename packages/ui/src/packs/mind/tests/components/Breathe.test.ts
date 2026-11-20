import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  readComponent,
  themeName,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController, KitProvider, PartScope, renderers } from "@lmthing/ui/kit";
import { addressedElements, config, renderInstance } from "../../../../../test/render";

const { props, meta, examples, fallback, probes } = components.Breathe;
const custom = { pattern: "custom", rounds: 20, inhale: 0, hold: 10, exhale: 10, rest: 0 };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const circle = "home/c1/circle";

describe("Breathe schema", () => {
  it.each(examples)("accepts a mind example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );

  it("uses a box pattern and the default finishes when omitted", () => {
    expect(props.parse({ rounds: 1 })).toEqual({
      pattern: "box",
      rounds: 1,
      surface: "card",
      emphasis: "normal",
      detail: "full",
    });
    expectTypeOf<Props<typeof props, typeof meta>["rounds"]>().toEqualTypeOf<number>();
  });

  it("accepts exact duration and round limits", () => {
    expect(props.parse(custom)).toMatchObject(custom);
  });

  it.each([
    {},
    { rounds: 0 },
    { rounds: 21 },
    { rounds: 1.5 },
    { rounds: 1, pattern: "slow" },
    { rounds: 1, pattern: "calm", rest: 0 },
    { ...custom, inhale: -1 },
    { ...custom, hold: 11 },
    { ...custom, exhale: 1.5 },
    { ...custom, rest: null },
    { ...custom, rest: undefined },
    { ...custom, hold: 0, exhale: 0 },
    { ...custom, color: "red" },
    { ...custom, elapsed: 5 },
    { ...custom, running: true },
    { ...custom, detail: "hidden" },
  ])("rejects invalid or runtime-only fields", (input) => expect(props.safeParse(input).success).toBe(false));
});

describe("Breathe fallback and metadata", () => {
  const casts: CastLike[] = [
    { things: [], items: [] },
    {
      things: [{ type: "routine", fields: ["name"] }],
      items: [{ id: "routine_1", type: "routine", sample: true, name: "Evening wind-down" }],
    },
    { things: [], items: [{ id: "routine_1", type: "routine", sample: true, name: 7 }] },
  ];
  it.each(casts)("seeds a valid single box round without requiring cast text", (cast) => {
    expect(props.parse(fallback({ cast }))).toMatchObject({ pattern: "box", rounds: 1 });
  });

  it("preserves the core-first probe, phone tier, root and the pack readiness gate", () => {
    expect(meta).toMatchObject({
      tier: "phone",
      status: "ready",
      states: ["filled", "success"],
      parts: ["root", "circle", "phase", "rounds"],
    });
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Timer");
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Breathe" }));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Timer" }));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "write", expect: "Breathe" }));
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "read", screen: 0, expect: { address: "b1/circle", action: "play" } }),
    );
    expect(createRegistry({ packs: ["mind"] }).ids.includes("Breathe")).toBe(packReady("mind"));
    expect(createRegistry({ packs: ["mind"], includeDrafts: true }).ids).toContain("Breathe");
  });
});

describe("Breathe state, parts and reading", () => {
  it("draws the cue, rounds and play target in the filled state", () => {
    const parts = addressedElements(renderInstance("Breathe", { rounds: 4 }, "filled", theme));
    expect([...parts.keys()]).toEqual(meta.parts.map((part) => `home/c1/${part}`));
    expect(parts.get(circle)?.attributes).toContain('role="button"');
    expect(parts.get(circle)?.attributes).toContain('aria-label="Play breathing · Breathe in"');
    expect(parts.get("home/c1/phase")?.text).toEqual(["Breathe in"]);
    expect(parts.get("home/c1/rounds")).toMatchObject({
      text: [" rounds left"],
      children: [{ text: ["4"] }],
    });
    const reading = readComponent(components.Breathe, { rounds: 4 }, "b1").join("\n");
    expect(reading).toContain("Play — Breathe in — 4 rounds left [b1/circle play]");
    expect(reading).not.toContain("[b1/circle pause");
  });

  it("reads completion without offering play or pause", () => {
    const reading = readComponent(components.Breathe, { rounds: 1 }, "b1", "success").join("\n");
    expect(reading).toContain("Breathe (success) Complete");
    expect(reading).toContain("0 rounds left");
    expect(reading).not.toContain("[b1/circle");
  });

  it.each(["filled", "success"] as const)("hides rounds in brief detail in %s", (state) => {
    const input = { detail: "brief", rounds: 4 };
    const parts = addressedElements(renderInstance("Breathe", input, state, theme));
    expect(parts.has("home/c1/rounds")).toBe(false);
    expect(parts.has("home/c1/phase")).toBe(true);
    expect(parts.has(circle)).toBe(state === "filled");
    const reading = readComponent(components.Breathe, input, "b1", state).join("\n");
    expect(reading).not.toContain("rounds left");
  });
});

function exercise() {
  const seed = { pattern: "custom", rounds: 2, inhale: 1, hold: 0, exhale: 2, rest: 0 };
  const controller = createScreenController({
    screen: { id: "home", components: [{ ...seed, c: "Breathe", id: "c1" }] },
    defs: components,
    requireMounted: true,
  });
  controller.registerPart(circle);
  const read = () => controller.read();
  const render = () => {
    const state = controller.snapshotScreen().components[0]?.state ?? "filled";
    return addressedElements(
      renderToStaticMarkup(
        createElement(
          TamaguiProvider,
          { config, defaultTheme: themeName(theme) },
          createElement(
            KitProvider,
            { theme, controller, children: null },
            createElement(
              PartScope,
              { screen: "home", component: "c1", rev: 1, state, children: null },
              createElement(renderers.Breathe, props.parse(seed)),
            ),
          ),
        ),
      ),
    );
  };
  return { controller, read, render };
}

it("keeps circle taps, agent playback, phase readings and completion on the same clock", () => {
  vi.useFakeTimers();
  const { controller, read, render } = exercise();
  const act = (action: "play" | "pause") => controller.act({ address: circle, action }, { agent: true });
  try {
    expect(act("pause").ok).toBe(false);
    expect(controller.press(circle).ok).toBe(true);
    expect(act("play").ok).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(read()).toContain("Breathe out — Pause — 2 rounds left [c1/circle pause]");
    expect(render().get(circle)?.attributes).toContain('aria-label="Pause breathing · Breathe out"');
    expect(act("pause").ok).toBe(true);
    vi.advanceTimersByTime(10000);
    expect(read()).toContain("Play — Breathe out — 2 rounds left [c1/circle play]");
    expect(render().get(circle)?.attributes).toContain('aria-label="Play breathing · Breathe out"');
    expect(act("play").ok).toBe(true);
    vi.advanceTimersByTime(2000);
    expect(read()).toContain("Breathe in — Pause — 1 round left [c1/circle pause]");
    expect(render().get("home/c1/rounds")).toMatchObject({
      text: [" round left"],
      children: [{ text: ["1"] }],
    });
    expect(controller.press(circle).ok).toBe(true);
    expect(controller.actionsAt(circle)).toEqual(["play"]);
    expect(controller.press(circle).ok).toBe(true);
    vi.advanceTimersByTime(3000);
    expect(read()).toContain("Breathe (success) Complete — 0 rounds left");
    expect(read()).not.toContain("[c1/circle");
    expect(render().has(circle)).toBe(false);
    expect(render().get("home/c1/phase")?.text).toEqual(["Complete"]);
    expect(controller.press(circle).ok).toBe(false);
    expect(act("play").ok).toBe(false);
    expect(act("pause").ok).toBe(false);
  } finally {
    controller.dispose();
    vi.useRealTimers();
  }
});
