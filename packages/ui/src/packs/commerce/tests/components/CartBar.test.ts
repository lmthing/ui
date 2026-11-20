import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  planAct,
  readComponent,
  themeName,
  type CastLike,
  type DeviceData,
  type Props,
  type StateName,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { addressedElements, config } from "../../../../../test/render";
import { createScreenController, PhoneScreen, type PhoneScreenProps } from "../../../../kit";
import { pack } from "../..";
import { CartBar } from "../../components";

const def = components.CartBar;
const { props, meta, examples, fallback, probes } = def;
const example = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const deviceData = { basket: [{ count: 3, total: 24.5 }] };
const press = { address: "c1", action: "press" };

function screenFor(state: StateName = "filled", input = example) {
  return { id: "home", components: [{ id: "c1", c: "CartBar", state, ...input }] };
}

function renderBar(state: StateName, data?: DeviceData, input = example, lang?: string) {
  const phone: PhoneScreenProps = {
    defs: components,
    renderers: { CartBar: CartBar.CartBar },
    screen: screenFor(state, input),
    theme,
    lang,
    deviceData: data,
  };
  return renderToStaticMarkup(
    createElement(
      TamaguiProvider,
      { config, defaultTheme: themeName(theme) },
      createElement(PhoneScreen, phone),
    ),
  );
}

describe("CartBar schema boundaries", () => {
  it.each(examples)("accepts each example", (input) => expect(props.safeParse(input).success).toBe(true));
  it("accepts the longest screen id and defaults to normal emphasis", () => {
    const goto = "a".repeat(64);
    expect(props.parse({ goto })).toMatchObject({ goto, emphasis: "normal" });
    expectTypeOf<Props<typeof props, typeof meta>>().not.toHaveProperty("count");
    expectTypeOf<Props<typeof props, typeof meta>>().not.toHaveProperty("total");
  });
  it.each([
    {},
    { goto: "" },
    { goto: "Bad id" },
    { goto: "a".repeat(65) },
    { ...example, density: "small" },
    { ...example, emphasis: "hero" },
    { ...example, count: 2 },
    { ...example, total: 12 },
    { ...example, basket: [] },
    { ...example, color: "red" },
  ])("rejects invalid destinations, variants and host data", (input) => {
    expect(props.safeParse(input).success).toBe(false);
  });
});

describe("CartBar fallback and metadata", () => {
  it("uses a valid cast id or a neutral destination", () => {
    const cast: CastLike = { things: [], items: [{ id: "item_one", type: "item", sample: true }] };
    const empty: CastLike = { things: [], items: [] };
    const malformed = { ...cast, items: [{ ...cast.items[0]!, id: "Bad id" }] };
    for (const [input, goto] of [
      [cast, "item_one"],
      [empty, "detail"],
      [malformed, "detail"],
    ] as const) {
      expect(props.parse(fallback({ cast: input })).goto).toBe(goto);
    }
  });
  it("keeps the bottom region, pack gate, parts, phone tier and core-first probes", () => {
    expect(meta).toMatchObject({
      region: "bottom",
      weight: 2,
      tier: "phone",
      states: ["filled", "empty"],
      deviceData: ["basket"],
    });
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(createRegistry({ packs: [pack.id] }).ids.includes(meta.id)).toBe(packReady(pack.id));
    expect(probes.filter(({ kind }) => kind === "choose").map(({ expect }) => expect)).toEqual([
      "CartBar",
      "Button",
    ]);
    expect(probes).toContainEqual(expect.objectContaining({ kind: "write", expect: "CartBar" }));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "read", expect: press }));
  });
});

describe("CartBar states and parts", () => {
  it.each(examples)("draws one link containing all summary parts in either finish", (input) => {
    const html = renderBar("filled", deviceData, input);
    const parts = addressedElements(html);
    expect([...parts.keys()].sort()).toEqual(meta.parts.map((part) => `home/c1/${part}`).sort());
    expect(parts.get("home/c1/root")?.attributes).toContain('role="link"');
    expect(parts.get("home/c1/root")?.attributes).toContain('aria-label="View basket"');
    expect(parts.get("home/c1/label")?.text).toEqual(["View basket"]);
    expect(parts.get("home/c1/count")?.text).toEqual(["3 items"]);
    expect(parts.get("home/c1/total")?.text).toEqual(["$24.50"]);
  });
  it.each([
    { state: "empty", data: deviceData },
    { state: "filled", data: undefined },
    { state: "filled", data: { basket: [] } },
    { state: "filled", data: { basket: [{ count: 0, total: 0 }] } },
  ] as const)("hides every part for $state with $data", ({ state, data }) => {
    expect([...addressedElements(renderBar(state, data)).keys()]).toEqual([]);
  });
});

describe("CartBar read and act", () => {
  it("reads the same host amounts as the view and navigates with the root press", () => {
    const screen = screenFor();
    const onLink = vi.fn();
    const lang = "en-GB";
    const data = { basket: [{ count: 1, total: 12.5, currency: "GBP" }] };
    const runtime = createScreenController({ screen, defs: components, deviceData: data, lang, onLink });
    const html = renderBar("filled", data, example, lang);
    for (const line of ["View basket", "1 item", "£12.50"]) {
      expect(html).toContain(line);
      expect(runtime.read()).toContain(line);
    }
    expect(runtime.read()).toContain(`[c1 press→${example.goto}]`);
    expect(runtime.act({ address: "c1/count", action: "press" })).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
    expect(runtime.press("home/c1/root")).toMatchObject({ ok: true });
    expect(onLink).toHaveBeenCalledExactlyOnceWith(example.goto, "home/c1");
    expect(planAct(screen, components, {}, [press], null, "planner", data)).toMatchObject({
      ok: true,
      links: [{ goto: example.goto, address: "home/c1" }],
    });
    expect(runtime.snapshotScreen()).toEqual(screen);
    runtime.dispose();
  });
  it("omits copy and rejects navigation in the explicit empty state, even with a stale summary", () => {
    const screen = screenFor("empty");
    const onLink = vi.fn();
    const runtime = createScreenController({ screen, defs: components, deviceData, onLink });
    expect(readComponent(def, example, "c1", "empty", {}, undefined, deviceData)).toEqual([
      "c1 CartBar (empty)",
    ]);
    expect(runtime.act(press)).toMatchObject({ ok: false, code: "not_actionable" });
    expect(planAct(screen, components, {}, [press], null, "planner", deviceData)).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
    expect(onLink).not.toHaveBeenCalled();
    runtime.dispose();
  });
});
