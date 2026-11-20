import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  planAct,
  readComponent,
  type CastLike,
  type Props,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, elementAt, renderInstance } from "../../../../../test/render";
import { pack } from "../..";

const def = components.Checkout;
const { props, meta, examples, fallback, probes } = def;
const delivery = examples[0]!;
const pickup = examples[1]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const place = { address: "c1/place", action: "press" };
const address = { address: "c1/address", action: "press" };
const select = (part: "mode" | "method", value: string) => ({
  address: `c1/${part}`,
  action: "select",
  value,
});
const screen = { id: "home", components: [{ id: "c1", c: "Checkout", ...delivery }] };

describe("Checkout schema boundaries", () => {
  it.each(examples)("accepts each example", (example) => expect(props.safeParse(example).success).toBe(true));
  it("accepts exact limits, trims details, and defaults to full card", () => {
    expect(props.parse({ ...delivery, address: ` ${"a".repeat(60)} `, time: "t".repeat(20) })).toMatchObject({
      address: "a".repeat(60),
      time: "t".repeat(20),
      surface: "card",
      detail: "full",
    });
    expectTypeOf<Props<typeof props, typeof meta>["method"]>().toEqualTypeOf<"cash" | "card" | "wallet">();
  });
  it.each([
    {},
    { ...delivery, modes: [] },
    { ...delivery, methods: [] },
    { ...delivery, modes: ["pickup", "delivery", "table", "pickup"] },
    { ...delivery, methods: ["cash", "card", "wallet", "card"] },
    { ...delivery, modes: ["delivery", "delivery"] },
    { ...delivery, methods: ["card", "card"] },
    { ...delivery, mode: "curbside" },
    { ...delivery, method: "transfer" },
    { ...delivery, modes: ["pickup"] },
    { ...delivery, methods: ["cash"] },
    { ...delivery, time: "a".repeat(21) },
    { ...delivery, address: "a".repeat(61) },
    { ...delivery, address: " " },
    { ...delivery, detail: "hidden" },
    { ...delivery, color: "red" },
    { ...delivery, total: 25 },
    { ...delivery, basket: [] },
  ])("rejects invalid or host-owned data", (input) => expect(props.safeParse(input).success).toBe(false));
});

describe("Checkout fallback and metadata", () => {
  it("uses a bounded cast detail or the neutral placeholder", () => {
    const cast: CastLike = {
      things: [{ type: "plant", fields: ["name", "room"] }],
      items: [{ id: "fern", type: "plant", sample: true, name: "Fern", room: "Bathroom" }],
    };
    const empty = { things: [], items: [] };
    const malformed = { ...cast, items: [{ ...cast.items[0]!, room: 4 }] };
    for (const [input, expected] of [
      [cast, "Bathroom"],
      [empty, "Details"],
      [malformed, "Details"],
    ] as const) {
      const value = fallback({ cast: input });
      expect(props.safeParse(value).success).toBe(true);
      expect(value.address).toBe(expected);
    }
  });
  it("keeps the commerce readiness gate and core-first near miss", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "phone", weight: 2, states: ["filled", "success"] });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(createRegistry({ packs: [pack.id] }).ids.includes(meta.id)).toBe(packReady(pack.id));
    expect(probes.filter(({ kind }) => kind === "choose").map(({ expect: target }) => target)).toEqual([
      "Checkout",
      "Field",
    ]);
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
    );
    expect(probes).toContainEqual(expect.objectContaining({ kind: "read", expect: place }));
  });
});

describe("Checkout states and parts", () => {
  it("draws two named controls with radios, a delivery button and a separate place button", () => {
    const html = renderInstance("Checkout", delivery, "filled", theme);
    for (const [part, label, options, selected] of [
      ["mode", "Fulfillment", ["pickup", "delivery", "table"], "delivery"],
      ["method", "Payment", ["card", "cash", "wallet"], "card"],
    ] as const) {
      const group = elementAt(html, `home/c1/${part}`);
      expect(group.attributes).toContain('role="radiogroup"');
      expect(group.attributes).toContain(`aria-label="${label}"`);
      const radios = group.children.filter(({ attributes }) => attributes.includes('role="radio"'));
      expect(radios).toHaveLength(options.length);
      radios.forEach((radio, index) => {
        expect(radio.attributes).toContain(`aria-label="${options[index]}"`);
        expect(radio.attributes).toContain(`aria-checked="${options[index] === selected}"`);
      });
    }
    expect(elementAt(html, "home/c1/address").attributes).toContain('role="button"');
    expect(elementAt(html, "home/c1/place").attributes).toContain('role="button"');
    expect([...addressedElements(html).keys()].sort()).toEqual(
      ["root", "mode", "time", "address", "method", "total", "place", "place_label"]
        .map((part) => `home/c1/${part}`)
        .sort(),
    );
  });
  it("hides only time in brief, and shows an address control only for delivery", () => {
    const brief = { ...delivery, detail: "brief" };
    const html = renderInstance("Checkout", brief, "filled", theme);
    expect(html).not.toContain("Tomorrow 10:30");
    expect(readComponent(def, brief, "c1").join("\n")).not.toContain("Tomorrow 10:30");
    expect(elementAt(html, "home/c1/address").attributes).toContain('role="button"');
    expect(renderInstance("Checkout", pickup, "filled", theme)).not.toContain("home/c1/address");
    expect(renderInstance("Checkout", { ...delivery, address: undefined }, "filled", theme)).toContain(
      "Add delivery address",
    );
  });
  it("renders success without an actionable control and rejects further edits", () => {
    const html = renderInstance("Checkout", delivery, "success", theme);
    expect(html).toContain("Order placed");
    expect(html).not.toMatch(/role="(?:button|radiogroup)"/);
    const done = { ...screen, components: [{ ...screen.components[0]!, state: "success" as const }] };
    const runtime = createScreenController({ screen: done, defs: components });
    for (const action of [place, address, select("mode", "pickup"), select("method", "cash")]) {
      expect(runtime.act(action)).toMatchObject({ ok: false, code: "not_actionable" });
      expect(planAct(done, components, {}, [action])).toMatchObject({ ok: false, code: "not_actionable" });
    }
    expect(runtime.read()).toContain("Order placed");
    expect(runtime.read()).not.toContain("[c1/place");
  });
});

describe("Checkout read and act", () => {
  it("reads the host total, updates the tier, and gates address on the live mode", () => {
    const runtime = createScreenController({
      screen,
      defs: components,
      deviceData: { basket: [{ total: 16 }] },
    });
    expect(runtime.read()).toContain("$16");
    expect(runtime.read()).toContain("[c1/place press !needs-service]");
    expect(runtime.read()).toContain("[c1/address press]");
    for (const method of ["wallet", "cash"]) {
      expect(runtime.act(select("method", method))).toMatchObject({ ok: true });
      expect(runtime.read()).toContain(
        method === "cash" ? "[c1/place press]" : "[c1/place press !needs-service]",
      );
    }
    expect(runtime.act(select("mode", "pickup"))).toMatchObject({ ok: true });
    expect(runtime.act(address)).toMatchObject({ ok: false, code: "not_actionable" });
    expect(runtime.read()).not.toContain("21 Fern Lane");
    expect(runtime.snapshotScreen().components[0]).toMatchObject({ mode: "pickup", method: "cash" });
    expect(runtime.act(select("mode", "delivery"))).toMatchObject({ ok: true });
    expect(runtime.read()).toContain("21 Fern Lane");
  });
  it("validates independent offers and dispatches address and place to the host", () => {
    const onAction = vi.fn();
    const input = {
      ...screen,
      components: [{ ...screen.components[0]!, modes: ["delivery"], methods: ["card"], address: undefined }],
    };
    const runtime = createScreenController({ screen: input, defs: components, onAction });
    for (const invalid of [select("mode", "pickup"), select("method", "wallet"), select("mode", "card")]) {
      expect(runtime.act(invalid)).toMatchObject({ ok: false, code: "invalid_value" });
      expect(planAct(input, components, {}, [invalid])).toMatchObject({ ok: false, code: "invalid_value" });
    }
    for (const action of [address, place]) {
      expect(runtime.act(action)).toMatchObject({ ok: true });
      expect(onAction).toHaveBeenLastCalledWith({ ...action, address: `home/${action.address}` });
    }
  });
});
