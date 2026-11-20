import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  emptyLine,
  loadingLabel,
  packReady,
  placeholderTitle,
  type CastLike,
  type Props,
  type ScreenLike,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, elementAt, renderInstance } from "../../../../test/render";

const { props, meta, examples, fallback, probes } = components.Spinner;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const wheel = examples[0]!;
const strip = examples[1]!;
const spin = { address: "s1/spin", action: "press" } as const;
const reset = { address: "s1/reset", action: "press" } as const;
const address = (part: string) => `home/s1/${part}`;

function controller(setup: (typeof examples)[number], state: StateName, random = vi.fn(() => 0)) {
  const screen: ScreenLike = { id: "home", components: [{ id: "s1", c: "Spinner", state, ...setup }] };
  const onAction = vi.fn();
  const game = createScreenController({ screen, defs: components, random, onAction });
  return { game, random, onAction };
}

describe("Spinner contract and boundaries", () => {
  it.each(examples)("parses a real example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it("trims labels, defaults to a repeating wheel, and accepts six 24-character labels", () => {
    expect(props.parse({ options: [{ label: "  First " }, { label: "Second" }] })).toMatchObject({
      repeat: true,
      style: "wheel",
      detail: "full",
      options: [{ label: "First" }, { label: "Second" }],
    });
    const options = Array.from({ length: 6 }, (_, i) => ({ label: `${i}${"x".repeat(23)}` }));
    expect(props.parse({ options }).options).toEqual(options);
    expectTypeOf<Props<typeof props, typeof meta>["options"][number]["id"]>().toEqualTypeOf<string>();
  });

  it.each([
    { options: undefined },
    { options: [] },
    { options: [{ label: "First" }] },
    { options: Array.from({ length: 7 }, (_, i) => ({ label: `Option ${i}` })) },
    { options: [{ label: "One" }, { label: "   " }] },
    { options: [{ label: "One" }, { label: "x".repeat(25) }] },
    { options: [{ label: "First" }, { label: " first " }] },
    { options: [{ label: "One" }, { label: "Two", id: "r2" }] },
    { options: [{ label: "One" }, { label: "Two", width: 64 }] },
    { style: "grid" },
    { repeat: "false" },
    { color: "red" },
    { index: 0 },
    { used: [] },
    { remaining: 3 },
    { $draw: {} },
  ])("rejects invalid, unknown and runtime-only props", (input) => {
    expect(props.safeParse({ ...wheel, ...input }).success).toBe(false);
  });

  it("retains the phone tier, confirmed reset, core-first probes and pack readiness gate", () => {
    expect(meta.tier).toBe("phone");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.confirmParts).toEqual(["reset"]);
    expect(probes).toEqual([
      expect.objectContaining({ kind: "choose", expect: "Spinner" }),
      expect.objectContaining({ kind: "choose", expect: "Choice" }),
      expect.objectContaining({ kind: "write", expect: "Spinner" }),
      expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
      expect.objectContaining({ kind: "read", expect: spin }),
      expect.objectContaining({ kind: "read", expect: reset, screen: 1 }),
    ]);
    expect(createRegistry({ packs: ["play"] }).ids.includes("Spinner")).toBe(packReady("play"));
  });
});

describe("Spinner fallback", () => {
  it("uses neutral placeholders for empty and malformed cast and deduplicates usable titles", () => {
    const empty: CastLike = { things: [], items: [] };
    const cast = (names: (string | number)[]): CastLike => ({
      things: [{ type: "entry", fields: ["name"] }],
      items: names.map((name, i) => ({ id: `entry_${i}`, type: "entry", sample: true, name })),
    });
    const labels = (input: CastLike) => props.parse(fallback({ cast: input })).options.map((o) => o.label);
    expect(labels(empty)).toEqual([placeholderTitle(0), placeholderTitle(1)]);
    expect(labels(cast([42]))).toEqual(labels(empty));
    expect(labels(cast(["First", "FIRST", "Third"]))).toEqual(["FIRST", "Third"]);
    expect(labels(cast([placeholderTitle(0)]))).toEqual(labels(empty));
    expect(labels(cast(Array.from({ length: 8 }, (_, i) => `Option ${i}`)))).toHaveLength(6);
  });
});

describe("Spinner states and parts", () => {
  it.each(examples)("draws the option roots and labels for each style", (setup) => {
    const html = renderInstance("Spinner", setup, "filled", theme, { component: "s1" });
    expect(html.match(/data-testid="home\/s1\/root"/g)).toHaveLength(1);
    expect(elementAt(html, address("wheel"))).toBeDefined();
    const parts = addressedElements(html);
    setup.options.forEach(({ label }, i) => {
      expect(elementAt(html, address(`r${i + 1}/root`)).attributes).toContain(label);
      expect(parts.get(address(`r${i + 1}/label`))?.text).toEqual("detail" in setup ? undefined : [label]);
    });
    expect(elementAt(html, address("spin")).attributes).toContain('role="button"');
    expect(html.includes(address("reset"))).toBe("repeat" in setup && setup.repeat === false);
    expect(html).not.toContain(address("result"));
  });

  it.each(examples)("separates the empty message from Spin with the drawing", (setup) => {
    const empty = renderInstance("Spinner", setup, "empty", theme, { component: "s1", thing: "game" });
    expect(empty).toContain(emptyLine("game"));
    const order = [...addressedElements(empty).keys()];
    for (const part of ["empty", "wheel", "spin"]) expect(order).toContain(address(part));
    expect(order.indexOf(address("empty"))).toBeLessThan(order.indexOf(address("wheel")));
    expect(order.indexOf(address("wheel"))).toBeLessThan(order.indexOf(address("spin")));
    expect(elementAt(empty, address("spin")).attributes).not.toContain("aria-disabled");
    expect(empty).not.toContain(address("reset"));
  });

  it("exposes no controls or result while loading", () => {
    const loading = renderInstance("Spinner", strip, "loading", theme, { component: "s1" });
    expect(loading).toContain(loadingLabel);
    expect(elementAt(loading, address("wheel")).attributes).toContain('aria-busy="true"');
    expect(loading).not.toMatch(/home\/s1\/(?:spin|reset|result|r\d+\/label)/);
    expect(loading).not.toContain(`aria-label="${strip.options[0]!.label}"`);
  });
});

describe("Spinner read and act", () => {
  it("exhausts the pool, cancels reset safely, then restores all options only upon confirmation", () => {
    const { game, random, onAction } = controller(strip, "empty");
    expect(game.read()).toContain("(empty) used=[] remaining=3 [s1/spin press]");
    expect(game.act(reset).ok).toBe(false);
    onAction.mockImplementationOnce(() => expect(game.read()).toContain("index=0 — used=[0]"));
    expect(game.act(spin).ok).toBe(true);
    expect(game.read()).toContain(`${strip.options[0]!.label} — Spin again — Reset options`);
    expect(game.read()).toContain("2 options left");
    expect(game.act(spin).ok).toBe(true);
    expect(game.read()).toContain("1 option left");
    expect(game.act(spin).ok).toBe(true);
    expect(game.read()).toContain("No options left");
    expect(game.read()).toContain("index=2 — used=[0,1,2] — remaining=0");
    expect(game.read()).not.toContain("[s1/spin press]");
    expect(game.act(spin).ok).toBe(false);
    expect(game.act(reset).ok).toBe(true);
    expect(game.press("confirm/cancel").ok).toBe(true);
    expect(game.read()).toContain("remaining=0");
    expect(game.act(reset).ok).toBe(true);
    expect(game.press("confirm/confirm").ok).toBe(true);
    expect(game.read()).toContain("(empty) used=[] remaining=3 [s1/spin press]");
    expect(game.read()).not.toContain("index=");
    expect(random).toHaveBeenCalledTimes(2);
    expect(game.act(spin).ok).toBe(true);
    expect(game.read()).toContain("index=0 — used=[0] — remaining=2");
  });

  it("blocks both controls while loading, retains the stored result, and allows drawing in success", () => {
    const { game, random } = controller(strip, "success");
    expect(game.act(spin).ok).toBe(true);
    game.store.set(address("$state"), "loading");
    expect(game.read()).toBe("screen home\ns1 Spinner[strip] (loading)");
    expect(game.act(spin).ok).toBe(false);
    expect(game.act(reset).ok).toBe(false);
    expect(random).toHaveBeenCalledTimes(1);
    game.store.set(address("$state"), undefined);
    expect(game.read()).toContain("(success)");
    expect(game.read()).toContain("index=0 — used=[0] — remaining=2");
    expect(game.act(spin).ok).toBe(true);
  });

  it("can draw the same option again with repeats and never offers reset", () => {
    const { game, random } = controller(wheel, "filled");
    expect(game.read()).toContain("Ready to spin");
    expect(game.read()).not.toContain("index=");
    expect(game.act(spin).ok).toBe(true);
    expect(game.act(spin).ok).toBe(true);
    expect(game.read()).toContain("index=0 — used=[] — remaining=3");
    expect(game.read()).not.toContain("[s1/reset press]");
    expect(game.act(reset).ok).toBe(false);
    expect(game.snapshotScreen().components[0]).not.toHaveProperty("index");
    expect(random).toHaveBeenCalledTimes(2);
  });
});
