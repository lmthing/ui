import { describe, expect, it } from "vitest";
import {
  components,
  placeholderTitle,
  readComponent,
  type ScreenLike,
  type StateName,
} from "@lmthing/ui/catalog";
import { createInteractionStore, createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { visibleTexts } from "../../../../../test/variants";

const { props, fallback, examples, meta, probes } = components.BuzzerPad;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const part = (name: string) => `home/c1/${name}`;
const sample = examples[0]!;

describe("BuzzerPad contract", () => {
  it.each(examples)("accepts each example", (example) => expect(props.safeParse(example).success).toBe(true));
  it("uses cast names, neutral placeholders and distinct default swatches", () => {
    const neutral = fallback({ cast: { things: [], items: [] } });
    expect(neutral.players.map(({ name }) => name)).toEqual([placeholderTitle(0), placeholderTitle(1)]);
    expect(new Set(neutral.players.map(({ swatch }) => swatch)).size).toBe(2);
    const things = [{ type: "team", fields: ["name"] }];
    const item = { id: "team", type: "team", sample: true, name: "First team" };
    expect(fallback({ cast: { things, items: [item] } }).players[0]?.name).toBe("First team");
    expect(props.safeParse(fallback({ cast: { things, items: [{ ...item, name: 5 }] } })).success).toBe(true);
  });
  it("bounds players, swatches and prompt without accepting timing state", () => {
    const player = { name: "x".repeat(16), swatch: "grey" };
    const players = Array.from({ length: 4 }, () => player);
    expect(props.parse({ players, prompt: "x".repeat(48) }).arrange).toBe("grid");
    for (const invalid of [
      { players: [player] },
      { players: [...players, player] },
      { players: [player, { name: "Player" }] },
      { players: [player, { ...player, swatch: "#123456" }] },
      { players: [player, { ...player, name: "x".repeat(17) }] },
      { prompt: "x".repeat(49) },
      { arrange: "strip" },
      { style: "rows" },
      { winner: 0 },
      { deltas: [0, 5] },
    ])
      expect(props.safeParse({ players, ...invalid }).success).toBe(false);
  });
  it("reads the public prompt and exposes a separate buzz address for each player", () => {
    const lines = readComponent(components.BuzzerPad, examples[0], "b1").join("\n");
    expect(lines).toContain("Name that leaf");
    expect(lines).toContain("[b1/r1/buzz press]");
    expect(lines).toContain("[b1/r2/buzz press]");
  });
  it("declares timed buzzes, successful round actions, and its core near miss", () => {
    expect(meta.parts).toContain("winner");
    expect(meta.buzz).toEqual({ press: "buzz", reset: "reset" });
    expect(meta.successActions).toEqual(["buzz.press", "reset.press"]);
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Timer" }));
  });
});

it("renders the addressed pads and reset in both arrangements and keeps loading inert", () => {
  for (const input of examples) {
    const html = renderInstance("BuzzerPad", input, "filled", theme);
    const ready = addressedElements(html);
    for (const [index, player] of input.players.entries()) {
      const addr = `r${index + 1}`;
      expect(ready.has(part(`${addr}/root`))).toBe(true);
      expect(ready.get(part(`${addr}/buzz`))?.attributes).toContain('role="button"');
      expect(ready.get(part(`${addr}/name`))?.text).toEqual([player.name]);
      expect(ready.has(part(`${addr}/delta`))).toBe(false);
    }
    expect(ready.has(part("prompt"))).toBe("prompt" in input);
    expect(ready.get(part("status"))?.text).toEqual(["Ready to buzz"]);
    expect(ready.get(part("reset"))?.attributes).toContain('role="button"');
    expect(ready.has(part("winner"))).toBe(false);
  }
  const html = renderInstance("BuzzerPad", sample, "loading", theme);
  expect(html).toContain('role="progressbar"');
  expect(html).not.toContain('role="button"');
  expect(visibleTexts(html)).not.toContain("Fern team");
});

const screenFor = (input: Record<string, unknown>, state: StateName = "filled"): ScreenLike => ({
  id: "home",
  components: [{ ...input, id: "b1", c: "BuzzerPad", state }],
});

it("locks the first player, times late taps once, and lets the host start a fresh round", () => {
  let clock = 100;
  const controller = createScreenController({
    screen: screenFor(sample),
    defs: components,
    touchNow: () => clock,
  });
  try {
    expect(controller.press("b1/r2/buzz").ok).toBe(true);
    expect(controller.read()).toContain("Pothos team buzzed first");
    expect(controller.read()).toContain("BuzzerPad (success)");
    expect(controller.canPress("b1/r2/buzz")).toBe(false);
    expect(controller.canPress("b1/r1/buzz")).toBe(true);
    clock = 237.3;
    expect(controller.press("b1/r1/buzz").ok).toBe(true);
    expect(controller.read()).toContain("Fern team — 137 ms later");
    clock = 500;
    expect(controller.press("b1/r1/buzz").ok).toBe(false);
    expect(controller.read()).toContain("Pothos team buzzed first");
    expect(controller.read()).toContain("137 ms later");
    expect(controller.read()).not.toContain("400 ms later");
    expect(controller.press("b1/reset").ok).toBe(true);
    expect(controller.read()).toContain("Ready to buzz");
    expect(controller.read()).not.toContain("buzzed first");
    expect(controller.press("b1/r1/buzz").ok).toBe(true);
    expect(controller.read()).toContain("Fern team buzzed first");
  } finally {
    controller.dispose();
  }
});

it("does not expose timing state on wire props, loading, or a changed roster", () => {
  const store = createInteractionStore();
  const first = createScreenController({ screen: screenFor(sample), defs: components, store });
  const loading = createScreenController({ screen: screenFor(sample, "loading"), defs: components });
  try {
    expect(first.press("b1/r1/buzz").ok).toBe(true);
    expect(first.snapshotScreen().components[0]).not.toHaveProperty("$buzz");
    expect(loading.press("b1/r1/buzz").ok).toBe(false);
    expect(loading.press("b1/reset").ok).toBe(false);
    const replacement = createScreenController({
      screen: screenFor({ ...sample, players: [...sample.players].reverse() }),
      defs: components,
      store,
    });
    try {
      expect(replacement.read()).toContain("Ready to buzz");
      expect(replacement.read()).not.toContain("buzzed first");
      expect(replacement.press("b1/r1/buzz").ok).toBe(true);
      expect(replacement.read()).toContain("Pothos team buzzed first");
    } finally {
      replacement.dispose();
    }
  } finally {
    first.dispose();
    loading.dispose();
  }
});
