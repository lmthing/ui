import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { input as Input } from "zod";
import {
  components,
  createRegistry,
  nestedControls,
  packReady,
  placeholderTitle,
  readComponent,
  stampItemIds,
  themeName,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController, KitProvider, PartScope, renderers } from "@lmthing/ui/kit";
import { addressedElements, config, renderInstance } from "../../../../../test/render";

const { props, meta, examples, fallback, probes } = components.Feelings;
const example = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
type ViewProps = Props<typeof props, typeof meta>;
const castOf = (first: unknown, second: unknown): CastLike => ({
  things: [{ type: "record", fields: ["first", "second"] }],
  items: [{ id: "one", type: "record", sample: true, first, second }],
});
const select = (row: number) => ({ address: `f1/r${row}`, action: "select" });
const toggle = (row: number, word: number) => ({ address: `f1/r${row}/word_${word}`, action: "toggle" });

// prettier-ignore
function picker(input: Input<typeof props> = example) {
  const controller = createScreenController({
    screen: { id: "home", components: [{ ...input, id: "f1", c: "Feelings" }] },
    defs: components, requireMounted: false,
  });
  const stamped = stampItemIds(meta, props.parse(input)) as ViewProps;
  const render = () => addressedElements(renderToStaticMarkup(
    createElement(TamaguiProvider, { config, defaultTheme: themeName(theme) },
      createElement(KitProvider, { theme, controller, children: null },
        createElement(PartScope, { screen: "home", component: "f1", rev: 1, state: "filled", children: null },
          createElement(renderers.Feelings, stamped)))),
  ));
  return { controller, render };
}

describe("Feelings schema and boundaries", () => {
  it.each(examples)("accepts a real example", (input) => {
    expect(props.safeParse(input).success).toBe(true);
  });
  it.each([
    { families: undefined },
    { families: example.families.slice(1) },
    { families: Array(7).fill(example.families[0]) },
    ...[
      { label: " " },
      { label: "x".repeat(15) },
      { words: ["One", "Two"] },
      { words: Array(9).fill("One") },
      { words: ["One", "Two", "x".repeat(17)] },
      { id: "r1" },
      { word_controls: [] },
    ].map((change) => ({ families: [{ ...example.families[0], ...change }, ...example.families.slice(1)] })),
    { chosen: ["Settled", "Hopeful", "Worried", "Drained"] },
    { chosen: ["Settled", " Settled "] },
    { chosen: ["Unlisted"] },
    { chosen: [" "] },
    { chosen: ["x".repeat(17)] },
    { family: 1 },
    { color: "#ffffff" },
    { pixels: 4 },
    { detail: "minimal" },
    { density: "dense" },
    { surface: "shadow" },
  ])("rejects invalid input %j", (change) => {
    expect(props.safeParse({ ...example, ...change }).success).toBe(false);
  });
  it("accepts exact maximum lengths, family, word and selection counts", () => {
    const words = Array.from({ length: 8 }, (_, at) => `${at}${"x".repeat(15)}`);
    const families = Array.from({ length: 6 }, (_, at) => ({ label: `${at}${"x".repeat(13)}`, words }));
    expect(props.parse({ families, chosen: words.slice(0, 3) })).toMatchObject({
      surface: "card",
      detail: "full",
      families,
      chosen: words.slice(0, 3),
    });
    expectTypeOf<ViewProps["families"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toHaveProperty("family");
  });
});

describe("Feelings fallback and contract", () => {
  it("uses bounded cast text or distinct shared placeholders", () => {
    const empty = { things: [], items: [] };
    const populated = castOf("  Energy  ", " Alert ");
    for (const cast of [empty, populated, castOf(3, " "), castOf("x".repeat(40), "y".repeat(40))])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: populated }).families[0]).toMatchObject({
      label: "Energy",
      words: ["Alert", "Item one · 2", "Item one · 3"],
    });
    const neutral = fallback({ cast: empty });
    expect(neutral.chosen).toEqual([]);
    expect(neutral.families.map(({ label }) => label)).toEqual([0, 1, 2].map((at) => placeholderTitle(at)));
    expect(new Set(neutral.families.flatMap(({ words }) => words)).size).toBe(9);
  });
  it("preserves draft pack gating, the core near miss, probes and the phone tier", () => {
    expect(meta).toMatchObject({ status: "ready", states: ["filled"], tier: "phone" });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    const expected = (kind: string) =>
      probes.filter((probe) => probe.kind === kind).map((probe) => probe.expect);
    expect(expected("choose")).toEqual(["Feelings", "Scale"]);
    expect(probes.find((probe) => probe.kind === "write" && "variant" in probe)).toMatchObject({
      expect: "Feelings",
      variant: { axis: "detail", value: "brief" },
    });
    expect(expected("read")).toEqual([select(2), toggle(1, 2)]);
    expect(createRegistry({ packs: ["mind"] }).ids.includes("Feelings")).toBe(packReady("mind"));
  });
});

describe("Feelings state, parts and read/act", () => {
  it("only renders and reads the active family's words, keeping all family addresses", () => {
    const html = renderInstance("Feelings", example, "filled", theme);
    const parts = addressedElements(html);
    const sixFamilyParts = [1, 2, 3].flatMap((row) => [`r${row}/root`, `r${row}/label`]);
    for (const part of [...meta.parts, ...sixFamilyParts])
      expect(parts.has(`home/c1/${part}`), part).toBe(true);
    expect(parts.get("home/c1/r1/root")?.attributes).toContain('role="radio"');
    expect(parts.get("home/c1/r1/root")?.attributes).toContain('aria-checked="true"');
    expect(parts.get("home/c1/r1/word_2")?.attributes).toContain('role="checkbox"');
    expect([...parts.keys()].filter((key) => key.includes("/word_"))).toEqual(
      [1, 2, 3].map((word) => `home/c1/r1/word_${word}`),
    );
    const reading = readComponent(components.Feelings, example, "f1").join("\n");
    expect(reading).toContain('word_2 "Hopeful"');
    expect(reading).toContain("[f1/r1/word_2 toggle:on]");
    expect(reading).toContain('"Anxious"');
    expect(reading).not.toMatch(/Restless|Drained|\/r2\/word|\/r3\/word/);
    const brief = { ...example, detail: "brief" } as const;
    expect(renderInstance("Feelings", brief, "filled", theme)).not.toContain('data-testid="home/c1/hint"');
    expect(readComponent(components.Feelings, brief, "f1").join("\n")).not.toContain("Choose a family");
    expect(meta.read(props.parse(example), "loading", "en")).toEqual([]);
  });
});
describe("Feelings selection", () => {
  it("preserves checked words across families and rejects inactive, missing and capped toggles", () => {
    const { controller, render } = picker();
    expect(controller.act(toggle(2, 1))).toMatchObject({ code: "not_actionable" });
    expect(controller.act(toggle(1, 4))).toMatchObject({ code: "not_actionable" });
    expect(controller.act([select(2), toggle(2, 1)]).ok).toBe(true);
    expect(controller.act(toggle(2, 2))).toMatchObject({ code: "max_active" });
    const full = render();
    expect(full.has("home/f1/r1/word_1")).toBe(false);
    expect(full.get("home/f1/r2/root")?.attributes).toContain('aria-checked="true"');
    expect(full.get("home/f1/r2/word_1")?.attributes).toContain('aria-checked="true"');
    expect(full.get("home/f1/r2/word_1")?.attributes).not.toContain('aria-disabled="true"');
    expect(full.get("home/f1/r2/word_2")?.attributes).toContain('aria-disabled="true"');
    expect(full.get("home/f1/count")?.text).toContain("remaining 0");
    expect(controller.read()).toContain('word_1 "Restless"');
    expect(controller.read()).not.toMatch(/Hopeful|\[f1\/r2\/word_2 toggle/);
    expect(controller.read()).toContain("remaining 0");
    expect(controller.act([select(1), toggle(1, 2), toggle(1, 3)]).ok).toBe(true);
    expect(controller.read()).toContain("[f1/r1/word_3 toggle:on]");
    expect(controller.act([select(2), toggle(2, 1)]).ok).toBe(true);
    expect(controller.read()).toContain("remaining 1");
    expect(render().get("home/f1/r2/word_2")?.attributes).not.toContain('aria-disabled="true"');
    controller.dispose();
  });

  it("counts duplicate authored words once and keeps their first control", () => {
    const families = [
      { label: "Calm", words: ["Settled", "Hopeful", "Settled", "At ease"] },
      { label: "Anxious", words: ["Settled", "Worried", "On edge"] },
      { label: "Tired", words: ["Settled", "Hopeful", "Worried"] },
    ];
    const input = { families, chosen: ["Settled"] };
    const controls = nestedControls(meta, props.parse(input));
    expect(controls.map(({ item }) => item.label)).toEqual([
      "Settled",
      "Hopeful",
      "At ease",
      "Worried",
      "On edge",
    ]);
    const { controller, render } = picker(input);
    expect(controller.read()).toContain("remaining 2");
    expect(controller.act([select(2), toggle(2, 1), toggle(2, 2)]).ok).toBe(true);
    expect(controller.read()).toContain('word_1 "Worried"');
    expect(controller.read()).not.toContain('"Settled"');
    expect(controller.act(select(3)).ok).toBe(true);
    expect(controller.act(toggle(3, 1))).toMatchObject({ code: "not_actionable" });
    expect(controller.read()).toContain('r3 "Tired": "No additional words in this family."');
    expect(render().has("home/f1/r3/word_1")).toBe(false);
    controller.dispose();
  });
});
