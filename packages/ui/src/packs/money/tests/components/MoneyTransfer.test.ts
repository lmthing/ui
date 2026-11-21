import { describe, expect, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  type ScreenLike,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.MoneyTransfer;
const sample = def.examples[0]!;
const component = "m1";
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
function setup(input: Record<string, unknown> = sample, state?: "empty") {
  const screen: ScreenLike = {
    id: "home",
    components: [{ ...input, c: "MoneyTransfer", id: component, ...(state ? { state } : {}) }],
  };
  const onAction = vi.fn();
  const controller = createScreenController({
    screen,
    defs: components,
    onAction,
    deviceData: { transferScanner: [component] },
  });
  const act = (part: string, action: string, value?: unknown) =>
    controller.act({
      address: `${component}/${part}`,
      action,
      ...(value === undefined ? {} : { value }),
    });
  return { controller, act, onAction };
}

describe("MoneyTransfer contract", () => {
  it.each(def.examples)("accepts the domain example", (input) =>
    expect(def.props.safeParse(input).success).toBe(true),
  );
  it.each([
    { sources: [] },
    { sources: Array(5).fill({ label: "Account" }) },
    { sourceAt: 2 },
    { sources: [{ label: "Account", last4: "abcd" }] },
    { recipient: { name: "a".repeat(25) } },
    { amount: 0 },
    { amount: -10 },
    { amount: 0.001 },
    { amount: Infinity },
    { instantFee: -1 },
    { memo: "a".repeat(61) },
    { qrPayload: "a".repeat(121) },
    { mode: "refund" },
    { total: 25 },
    { color: "#fff" },
  ])("rejects invalid limits, choices and computed fields", (patch) =>
    expect(def.props.safeParse({ ...sample, ...patch }).success).toBe(false),
  );
  it("validates empty, matching and malformed cast fallbacks", () => {
    const empty = def.fallback({ cast: { things: [], items: [] } });
    expect(empty.recipient.name).toBe(placeholderTitle(0));
    expect(def.props.safeParse(empty).success).toBe(true);
    for (const title of ["Mina", "x".repeat(100), 42]) {
      const cast = { things: [], items: [{ id: "one", type: "payee", sample: true, title }] };
      expect(def.props.safeParse(def.fallback({ cast })).success).toBe(true);
    }
  });
  it("uses a core near miss and only publishes with the full pack", () => {
    expect(def.probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Field" }));
    expect(createRegistry({ packs: ["money"] }).ids.includes("MoneyTransfer")).toBe(packReady("money"));
  });
});

describe("MoneyTransfer runtime", () => {
  it("recomputes confirmation copy from the current mode and invokes only the confirmed request", () => {
    const { controller, act, onAction } = setup();
    expect(act("submit", "press").ok).toBe(true);
    expect(controller.read()).toContain("Confirm sending money?");
    expect(controller.act({ address: "confirm/cancel", action: "dismiss" }).ok).toBe(true);
    expect(onAction).not.toHaveBeenCalledWith(expect.objectContaining({ address: "home/m1/submit" }));
    expect(act("mode", "select", "request").ok).toBe(true);
    expect(controller.read()).toContain("From Mina Park");
    expect(controller.read()).not.toContain("m1/speed select");
    expect(act("submit", "press").ok).toBe(true);
    expect(controller.read()).toContain("Confirm requesting money?");
    expect(controller.act({ address: "confirm/confirm", action: "press" }).ok).toBe(true);
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({ address: "home/m1/submit", action: "press" }),
    );
  });
  it("blocks an empty, unaffordable or invalid amount and recomputes after edits", () => {
    const { controller, act } = setup({ ...sample, amount: undefined }, "empty");
    expect(act("submit", "press").ok).toBe(false);
    expect(act("pad", "type", "2.555").ok).toBe(false);
    expect(act("pad", "type", "70").ok).toBe(true);
    expect(act("source", "select", "Garden fund").ok).toBe(true);
    expect(controller.read()).toContain('m1/source select = "Garden fund"');
    expect(act("submit", "press").ok).toBe(false);
    expect(act("speed", "select", "standard").ok).toBe(true);
    expect(act("submit", "press").ok).toBe(true);
  });
  it("only sends scan from the QR tab, hides the memo in brief mode and never reads the QR payload", () => {
    const { controller, act, onAction } = setup({ ...sample, detail: "brief", qrPayload: "demo:fixture" });
    expect(act("memo", "type", "Note").ok).toBe(false);
    expect(act("scan", "scan").ok).toBe(false);
    expect(act("tab", "select", "qr").ok).toBe(true);
    expect(act("pad", "type", "1").ok).toBe(false);
    expect(act("submit", "press").ok).toBe(false);
    expect(act("scan", "scan").ok).toBe(true);
    expect(onAction).toHaveBeenCalledWith({ address: "home/m1/scan", action: "scan" });
    expect(controller.read()).not.toContain("demo:fixture");
  });
});

it("stamps only the parts drawn in transfer, QR and result states", () => {
  const render = (input: unknown, state: "filled" | "loading" | "error" | "success") => [
    ...addressedElements(renderInstance("MoneyTransfer", input, state, theme)).keys(),
  ];
  expect(render(sample, "filled")).toEqual(
    expect.arrayContaining(["home/c1/pad", "home/c1/submit", "home/c1/memo"]),
  );
  expect(render({ ...sample, detail: "brief" }, "filled")).not.toContain("home/c1/memo");
  expect(render(def.examples[1], "filled")).toEqual(expect.arrayContaining(["home/c1/code", "home/c1/scan"]));
  for (const state of ["loading", "error", "success"] as const)
    expect(render(sample, state)).not.toContain("home/c1/submit");
});
