import { describe, expect, it } from "vitest";
import {
  components,
  createRegistry,
  emptyLine,
  packReady,
  readComponent,
  type CastLike,
  type ScreenLike,
} from "@lmthing/ui/catalog";
import { createInteractionStore, createScreenController } from "@lmthing/ui/kit";
import { addressedElements, elementAt, renderInstance } from "../../../../test/render";

const { props, meta, examples, fallback, probes } = components.AmountPad;
const sample = { label: "Supplies", value: 24.5, max: 50, note: true };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const part = (suffix: string) => `home/a1/${suffix}`;
const type = (value: unknown, target = "pad") => ({ address: part(target), action: "type", value });
const render = (input: unknown, state: "filled" | "empty" = "filled") =>
  renderInstance("AmountPad", input, state, theme, { component: "a1" });

function setup(input: Record<string, unknown> = sample, state: "filled" | "empty" = "filled") {
  const store = createInteractionStore();
  const screen: ScreenLike = { id: "home", components: [{ id: "a1", c: "AmountPad", state, ...input }] };
  const controller = createScreenController({ screen, defs: components, store });
  return { controller, store };
}

describe("AmountPad contract and boundaries", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );

  it("trims labels and accepts the exact label length and maximum", () => {
    const label = "a".repeat(24);
    expect(props.parse({ label: ` ${label} `, value: 50, max: 50, note: true })).toEqual({
      label,
      value: 50,
      max: 50,
      note: true,
    });
    expect(props.safeParse({ ...sample, value: 0, max: 0 }).success).toBe(true);
  });

  it.each([
    {},
    { label: "Supplies" },
    ...[
      { label: " ".repeat(4) },
      { label: "a".repeat(25) },
      { value: -1 },
      { value: "24.50" },
      { value: 50.01 },
      { value: Infinity },
      { value: NaN },
      { max: -1 },
      { max: Infinity },
      { note: "Some text" },
      { color: "red" },
      { currency: "USD" },
    ].map((patch) => ({ ...sample, ...patch })),
  ])("rejects invalid amounts, notes and unknown input", (input) =>
    expect(props.safeParse(input).success).toBe(false),
  );

  it("keeps the phone tier, keypad opt-in and core-first probes", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "phone", weight: 2 });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Field");
    expect(props.meta()?.keypadParts).toEqual(["pad"]);
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "AmountPad" }),
        expect.objectContaining({ kind: "choose", expect: "Field" }),
        expect.objectContaining({ kind: "write", expect: "AmountPad" }),
        expect.objectContaining({ kind: "read", expect: { address: "a1/pad", action: "type" } }),
      ]),
    );
    expect(createRegistry({ packs: ["money"] }).ids.includes("AmountPad")).toBe(packReady("money"));
  });
});

describe("AmountPad fallback", () => {
  it("uses bounded cast titles or the neutral placeholder", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "entry", fields: ["name"] }],
        items: [{ id: "item", type: "entry", sample: true, name: "x".repeat(40) }],
      },
      { things: [], items: [{ id: "item", type: "entry", sample: true, name: 4 }] },
    ];
    const [empty, full, malformed] = casts.map((cast) => props.parse(fallback({ cast })));
    expect(empty).toEqual({ label: "Item one", note: false });
    expect(full).toEqual({ label: "x".repeat(24), note: false });
    expect(malformed).toEqual(empty);
  });
});

describe("AmountPad states and parts", () => {
  it("renders read-only value separately from the keypad and independent note input", () => {
    const html = render(sample);
    for (const name of meta.parts) {
      expect(html.match(new RegExp(`data-testid="${part(name)}"`, "g"))).toHaveLength(1);
    }
    const parts = addressedElements(html);
    expect(parts.get(part("value"))?.text).toContain("24.5");
    expect(parts.get(part("value"))?.attributes).not.toContain('role="textbox"');
    expect(elementAt(html, part("pad")).attributes).toContain('role="textbox"');
    expect(elementAt(html, part("note")).attributes).toContain('placeholder="Add a note"');
    for (const key of ["r1", "r9", "r10", "r11", "r12"]) {
      expect(elementAt(html, part(`${key}/root`)).children[0]?.attributes).toContain('role="button"');
    }
  });

  it("shows a blank but editable entry without a seed and omits the disabled note option", () => {
    const input = { label: "Income", note: false };
    const html = render(input);
    expect(addressedElements(html).get(part("value"))?.text.join("").trim()).toBe("");
    expect(elementAt(html, part("pad")).attributes).toContain('role="textbox"');
    expect(html).not.toContain(part("note"));
    const { controller, store } = setup(input);
    expect(controller.act(type({ append: "7" }))).toMatchObject({ ok: true });
    expect(store.get(part("pad"))).toBe("7");
    expect(controller.act(type("Walk", "note"))).toMatchObject({ ok: false, code: "not_actionable" });
  });

  it("shows only the empty message and offers no actions when explicitly empty", () => {
    const html = render(sample, "empty");
    expect(elementAt(html, part("root"))).toBeDefined();
    expect(html).toContain(emptyLine());
    for (const name of ["value", "pad", "note"]) expect(html).not.toContain(part(name));
    const { controller } = setup(sample, "empty");
    expect(controller.act(type("1"))).toMatchObject({ ok: false, code: "not_actionable" });
    expect(controller.act(type("Walk", "note"))).toMatchObject({ ok: false, code: "not_actionable" });
    expect(controller.read()).toContain("a1 AmountPad (empty)");
  });
});

describe("AmountPad read and act", () => {
  it("preserves draft digits, backspace, replacement and independent note text", () => {
    const { controller, store } = setup({ ...sample, value: 2 });
    expect(controller.read()).toContain('2 — 1 2 3 4 5 6 7 8 9 . 0 ⌫ — Add a note — "Supplies"');
    for (const append of ["4", ".", "5", "0"]) {
      expect(controller.act(type({ append }))).toMatchObject({ ok: true });
    }
    expect(controller.read()).toContain("24.50 — 1 2 3 4 5 6 7 8 9 . 0 ⌫");
    expect(controller.act(type({ backspace: true }))).toMatchObject({ ok: true });
    expect(store.get(part("pad"))).toBe("24.5");
    expect(controller.act(type("Potting soil", "note"))).toMatchObject({ ok: true });
    expect(controller.act(type("25.00"))).toMatchObject({ ok: true });
    expect(controller.read()).toContain('[a1/note type = "Potting soil"]');
    expect(controller.read()).toContain('[a1/pad type = "25.00"]');
    expect(controller.act(type(""))).toMatchObject({ ok: true });
    expect(controller.read()).toContain("a1 AmountPad 1 2 3 4 5 6 7 8 9 . 0 ⌫");
  });

  it("rejects over-limit or malformed edits and non-actions without changing the draft", () => {
    const { controller, store } = setup();
    for (const value of ["50.01", "-1", "1e-7", { append: "." }]) {
      expect(controller.act(type(value))).toMatchObject({ ok: false, code: "invalid_value" });
    }
    expect(controller.act(type({ backspace: true }, "note"))).toMatchObject({
      ok: false,
      code: "invalid_value",
    });
    expect(controller.act(type("25", "value"))).toMatchObject({ ok: false, code: "not_actionable" });
    expect(store.get(part("pad"))).toBeUndefined();
    expect(controller.act(type("50.00"))).toMatchObject({ ok: true });
    expect(readComponent(components.AmountPad, { ...sample, value: 1e-7 }, "a1")[0]).toContain("0.0000001");
  });
});
