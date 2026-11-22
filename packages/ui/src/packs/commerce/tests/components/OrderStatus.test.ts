import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  readComponent,
  type CastLike,
  type Props,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, elementAt, renderInstance } from "../../../../../test/render";
import { pack } from "../..";

const def = components.OrderStatus;
const { meta, props, examples, fallback, probes } = def;
const order = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;

describe("OrderStatus schema and boundaries", () => {
  it.each(examples)("accepts each example", (example) => expect(props.safeParse(example).success).toBe(true));

  it("applies defaults, trims labels and accepts the exact upper bounds", () => {
    const steps = Array.from({ length: 5 }, () => ({ label: ` ${"a".repeat(16)} `, time: "23:59" }));
    expect(props.parse({ steps, line: "b".repeat(48), at: 4, seller: true })).toMatchObject({
      steps: steps.map(() => ({ label: "a".repeat(16), time: "23:59" })),
      detail: "full",
      can_advance: false,
    });
    expect(props.parse(order)).toMatchObject({ can_advance: true });
    expect(props.parse({ ...order, detail: "brief" }).line).toBeUndefined();
    expectTypeOf<Props<typeof props, typeof meta>["steps"][number]["id"]>().toEqualTypeOf<string>();
  });

  it.each([
    {},
    { ...order, steps: order.steps.slice(0, 2) },
    { ...order, steps: Array.from({ length: 6 }, () => order.steps[0]) },
    { ...order, at: 3 },
    { ...order, at: -1 },
    { ...order, at: 1.5 },
    { ...order, seller: undefined },
    { ...order, seller: "true" },
    { ...order, line: "a".repeat(49) },
    { ...order, detail: "hidden" },
    { ...order, surface: "outlined" },
    { ...order, density: "dense" },
    { ...order, can_advance: true },
    { ...order, color: "red" },
    ...[
      { label: " " },
      { label: "a".repeat(17) },
      { time: "24:00" },
      { time: "09:60" },
      { time: "9:00" },
      { id: "r1" },
      { pixels: 4 },
    ].map((patch) => ({ ...order, steps: [{ ...order.steps[0], ...patch }, ...order.steps.slice(1)] })),
  ])("rejects invalid wire data", (input) => expect(props.safeParse(input).success).toBe(false));
});

describe("OrderStatus fallback and metadata", () => {
  it("uses a bounded cast title and neutral defaults for missing or malformed items", () => {
    const empty = { things: [], items: [] };
    const cast: CastLike = {
      things: [{ type: "plant", fields: ["name"] }],
      items: [
        { id: "fern", type: "plant", sample: true, name: "Fern " + "x".repeat(80) },
        { id: "bad", type: "plant", sample: true, name: 4 },
        { id: "basil", type: "plant", sample: true, name: "Basil" },
      ],
    };
    const blank = fallback({ cast: empty });
    expect(blank).toEqual({
      steps: ["Item one", "Item two", "Item three"].map((label) => ({ label })),
      at: 0,
      seller: false,
    });
    const filled = fallback({ cast });
    expect(filled.steps[0]!.label).toMatch(/^Fern /);
    expect(filled.steps.slice(1)).toEqual([{ label: "Item two" }, { label: "Basil" }]);
    for (const input of [blank, filled]) expect(props.safeParse(input).success).toBe(true);
  });

  it("keeps the core near miss, variant write, seller action, and pack gate", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "phone", weight: 2 });
    expect(meta.realPath).toContain("shared app");
    expect(meta).not.toHaveProperty("partTiers");
    expect(meta).not.toHaveProperty("confirmParts");
    expect(createRegistry({ packs: [pack.id] }).ids.includes(meta.id)).toBe(packReady(pack.id));
    expect(probes.filter(({ kind }) => kind === "choose").map(({ expect }) => expect)).toEqual([
      "OrderStatus",
      "Steps",
    ]);
    expect(probes).toContainEqual(
      expect.objectContaining({
        kind: "write",
        expect: "OrderStatus",
        variant: { axis: "detail", value: "brief" },
      }),
    );
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "read", expect: { address: "o1/next", action: "press" } }),
    );
  });
});

describe("OrderStatus states and parts", () => {
  it("addresses the track, the rows, authored line and only present clocks", () => {
    const html = renderInstance("OrderStatus", order, "filled", theme);
    const elements = addressedElements(html);
    for (const key of ["root", "track", "line", "next", "next_label", "r1/time", "r2/time"])
      expect(elements.has(`home/c1/${key}`)).toBe(true);
    for (const row of ["r1", "r2", "r3"])
      for (const key of ["root", "label"]) expect(elements.has(`home/c1/${row}/${key}`)).toBe(true);
    expect(elements.has("home/c1/r3/time")).toBe(false);
    expect(elementAt(html, "home/c1/r2/root").attributes).toContain('aria-label="Current stage: Preparing"');
    expect(elementAt(html, "home/c1/next").attributes).toContain('aria-label="Mark as Ready"');
  });

  it("hides only the secondary line in brief", () => {
    const full = addressedElements(renderInstance("OrderStatus", order, "filled", theme));
    const brief = addressedElements(
      renderInstance("OrderStatus", { ...order, detail: "brief" }, "filled", theme),
    );
    full.delete("home/c1/line");
    expect([...brief.keys()]).toEqual([...full.keys()]);
  });
});

describe("OrderStatus read and act", () => {
  it("reads the current status and times, and dispatches the seller's press without a link", () => {
    const read = readComponent(def, order, "o1").join("\n");
    for (const text of ["Current stage: Preparing", "Preparing · 09:00", "Mark as Ready", "[o1/next press]"])
      expect(read).toContain(text);
    expect(readComponent(def, { ...order, detail: "brief" }, "o1").join("\n")).not.toContain(order.line);
    const onAction = vi.fn();
    const onLink = vi.fn();
    const screen = { id: "home", components: [{ id: "o1", c: "OrderStatus", ...order }] };
    const runtime = createScreenController({ screen, defs: components, onAction, onLink });
    const action = { address: "home/o1/next", action: "press" } as const;
    expect(runtime.act(action)).toMatchObject({ ok: true });
    expect(onAction).toHaveBeenCalledExactlyOnceWith(action);
    expect(onLink).not.toHaveBeenCalled();
  });

  it.each([
    { input: { ...order, seller: false }, state: "filled", stage: "Preparing", row: "r2" },
    { input: { ...order, at: 2 }, state: "filled", stage: "Ready", row: "r3" },
    { input: order, state: "success", stage: "Ready", row: "r3" },
  ] as const)(
    "does not allow advancement for $state / $stage / seller $input.seller",
    ({ input, state, stage, row }) => {
      const html = renderInstance("OrderStatus", input, state, theme);
      const read = readComponent(def, input, "o1", state).join("\n");
      expect(addressedElements(html).has("home/c1/next")).toBe(false);
      const label = state === "filled" ? `Current stage: ${stage}` : stage;
      expect(elementAt(html, `home/c1/${row}/root`).attributes).toContain(`aria-label="${label}"`);
      expect(read).not.toContain("[o1/next press]");
      if (state === "success") {
        expect(html).toContain("Order complete");
        expect(read).toContain("Order complete");
        expect(read).toContain("09:00");
        expect(read).not.toContain("Current stage: Preparing");
      }
      const screen = { id: "home", components: [{ id: "o1", c: "OrderStatus", ...input, state }] };
      const onAction = vi.fn();
      const runtime = createScreenController({ screen, defs: components, onAction });
      expect(runtime.act({ address: "o1/next", action: "press" })).toMatchObject({
        ok: false,
        code: "not_actionable",
      });
      expect(onAction).not.toHaveBeenCalled();
    },
  );
});
