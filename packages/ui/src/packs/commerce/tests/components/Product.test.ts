import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  planAct,
  readComponent,
  type CastLike,
  type Props,
  type StateName,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import type { input } from "zod";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, elementAt, hasStepTarget, renderInstance } from "../../../../../test/render";
import { pack } from "../..";

const def = components.Product;
const { meta, props, fallback, examples, probes } = def;
const sale = examples[0]!;
const soldOut = { ...examples[1]!, stock: 0 };
const theme = { preset: "calm", accent: "moss", mode: "light" } satisfies ThemeChoice;
const add = { address: "c1/add", action: "press" };
const save = { address: "c1/save", action: "toggle" };
const more = { address: "c1/qty", action: "increment" };
const less = { address: "c1/qty", action: "decrement" };
const screenWith = (input: input<typeof props>, state: StateName = "filled") => ({
  id: "home",
  components: [{ id: "c1", c: "Product", ...input, state }],
});

describe("Product schema boundaries", () => {
  it.each(examples)("accepts a domain example", (input) => expect(props.safeParse(input).success).toBe(true));
  it("trims text at its exact limits and defaults to a full card with one unit", () => {
    expect(
      props.parse({
        ...sale,
        name: ` ${"x".repeat(32)} `,
        badge: "x".repeat(12),
        description: "x".repeat(240),
      }),
    ).toMatchObject({ name: "x".repeat(32), surface: "card", detail: "full", qty: 1 });
    expectTypeOf<Props<typeof props, typeof meta>["qty"]>().toEqualTypeOf<number>();
  });
  it.each([
    {},
    { ...sale, name: "x".repeat(33) },
    { ...sale, name: " " },
    { ...sale, badge: "x".repeat(13) },
    { ...sale, description: "x".repeat(241) },
    { ...sale, price: -1 },
    { ...sale, price: 0.001 },
    { ...sale, was: -1 },
    { ...sale, stock: -1 },
    { ...sale, stock: 1.5 },
    { ...sale, saved: "yes" },
    { ...sale, qty: 0 },
    { ...sale, qty: 100 },
    { ...sale, detail: "hidden" },
    { ...sale, color: "red" },
    { ...sale, available: true },
  ])("rejects invalid values and unknown fields", (input) =>
    expect(props.safeParse(input).success).toBe(false),
  );
});

describe("Product fallback and metadata", () => {
  it("uses cast content or neutral placeholders for empty and malformed casts", () => {
    const cast: CastLike = {
      things: [{ type: "plant", fields: ["name", "room"] }],
      items: [{ id: "fern", type: "plant", sample: true, name: "Fern", room: "Bathroom" }],
    };
    const malformed = { ...cast, items: [{ ...cast.items[0]!, name: 4, room: 2 }] };
    const empty = { things: [], items: [] };
    for (const value of [cast, malformed, empty])
      expect(props.safeParse(fallback({ cast: value })).success).toBe(true);
    expect(fallback({ cast })).toMatchObject({ name: "Fern", description: "Bathroom" });
    expect(fallback({ cast: empty })).toEqual({
      name: "Item one",
      description: "Details",
      price: 0,
      saved: false,
    });
  });
  it("has a ready phone contract, core near miss and variant probe", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "phone", region: "body", weight: 2 });
    expect(meta.realPath).not.toBe("");
    expect(createRegistry({ packs: [pack.id] }).ids.includes(meta.id)).toBe(packReady(pack.id));
    expect(probes.filter(({ kind }) => kind === "choose").map(({ expect: id }) => id)).toEqual([
      "Product",
      "Amount",
    ]);
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
    );
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "read", expect: { ...save, address: "p1/save" } }),
    );
  });
});

describe("Product states and parts", () => {
  it("shows product details, the save heart and two directions at one qty address", () => {
    const html = renderInstance("Product", sale, "filled", theme);
    const original = "root name price was description stock badge qty add add_label save save_icon";
    expect([...addressedElements(html).keys()].sort()).toEqual(
      original
        .split(" ")
        .map((part) => `home/c1/${part}`)
        .sort(),
    );
    expect(elementAt(html, "home/c1/save").attributes).toContain('aria-label="Save for later"');
    const qty = elementAt(html, "home/c1/qty");
    for (const { action } of [more, less]) expect(hasStepTarget(qty, action)).toBe(true);
    expect(elementAt(html, "home/c1/add").attributes).toContain('role="button"');
    expect(html).toContain("Only 3 left");
  });
  it("omits absent data and hides only the description in brief", () => {
    const brief = { ...sale, detail: "brief" };
    const html = renderInstance("Product", brief, "filled", theme);
    expect(html).not.toContain(sale.description);
    expect(readComponent(def, brief, "c1").join()).not.toContain(sale.description);
    expect(elementAt(html, "home/c1/add").attributes).toContain('role="button"');
    const unavailable = renderInstance("Product", soldOut, "filled", theme);
    expect(unavailable).not.toMatch(/home\/c1\/(?:was|badge)/);
    expect(unavailable).toContain("Sold out");
    expect(elementAt(unavailable, "home/c1/add").attributes).toContain('aria-disabled="true"');
    expect(elementAt(unavailable, "home/c1/save").attributes).toContain(
      'aria-label="Remove from saved items"',
    );
  });
  it("shows nonactionable loading and success states", () => {
    for (const state of ["loading", "success"] as const) {
      const html = renderInstance("Product", sale, state, theme);
      expect(html).not.toContain('role="button"');
      const screen = screenWith(sale, state);
      const controller = createScreenController({ screen, defs: components });
      for (const action of [add, more, less, save]) {
        expect(controller.act(action)).toMatchObject({ ok: false, code: "not_actionable" });
        expect(planAct(screen, components, {}, [action])).toMatchObject({
          ok: false,
          code: "not_actionable",
        });
      }
      if (state === "loading") expect(html).toContain('aria-busy="true"');
      else {
        expect(html).toContain("Added to basket");
        expect(controller.read()).toContain("Added to basket");
      }
    }
  });
});

describe("Product read and act", () => {
  it("projects quantity and enforces positive stock in mounted actions and pure batches", () => {
    const screen = screenWith(sale);
    const controller = createScreenController({ screen, defs: components });
    expect(controller.read()).toContain("Quantity: 1");
    expect(controller.act(less)).toMatchObject({ ok: false, code: "not_actionable" });
    expect(controller.act([more, more])).toMatchObject({ ok: true });
    expect(controller.read()).toContain("Quantity: 3");
    expect(controller.read()).not.toContain("[c1/qty increment]");
    expect(controller.act(more)).toMatchObject({ ok: false, code: "not_actionable" });
    expect(controller.act(less)).toMatchObject({ ok: true });
    expect(controller.read()).toContain("Quantity: 2");
    expect(planAct(screen, components, {}, [more, more, more])).toMatchObject({ ok: false, at: 2 });
    expect(planAct(screen, components, {}, [more, less])).toMatchObject({ ok: true });
  });
  it("does not offer purchasing at zero stock and keeps save reversible without confirmation", () => {
    const screen = screenWith(soldOut);
    const onAction = vi.fn();
    const controller = createScreenController({ screen, defs: components, onAction });
    for (const step of [add, more, less]) {
      expect(controller.act(step)).toMatchObject({ ok: false, code: "not_actionable" });
      expect(planAct(screen, components, {}, [step])).toMatchObject({ ok: false, code: "not_actionable" });
    }
    expect(controller.read()).toContain("[c1/save toggle:on]");
    expect(controller.act(save)).toMatchObject({ ok: true });
    expect(controller.read()).toContain("[c1/save toggle:off]");
    expect(controller.act(save)).toMatchObject({ ok: true });
    expect(controller.read()).toContain("[c1/save toggle:on]");
  });
  it("dispatches add to the host and caps quantities with unknown stock", () => {
    const onAction = vi.fn();
    const screen = screenWith({ ...examples[1]!, qty: 98 });
    const controller = createScreenController({ screen, defs: components, onAction });
    expect(controller.act(more)).toMatchObject({ ok: true });
    expect(controller.act(more)).toMatchObject({ ok: false, code: "not_actionable" });
    expect(controller.act(add)).toMatchObject({ ok: true });
    expect(onAction).toHaveBeenLastCalledWith({ ...add, address: "home/c1/add" });
  });
});
