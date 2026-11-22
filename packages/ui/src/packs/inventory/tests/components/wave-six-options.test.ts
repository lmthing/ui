import { describe, expect, it, vi } from "vitest";
import { components, type StateName } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, hasStepTarget, renderInstance } from "../../../../../test/render";

type Name = "Loans" | "Storage" | "Things";
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const max = Number.MAX_SAFE_INTEGER;
const row = { name: "Seed tray", goto: "tray", qty: 2 };
const loan = { thing: "Shears", way: "lent", since: "2026-10-02", person: "Ana" };
const storage = { path: [], spots: [], here: [] };
const scan = { goto: "scan_inventory" };
const draw = (id: Name, input: object, state: StateName = "filled") =>
  addressedElements(renderInstance(id, input, state, theme, { component: "x" }));
const at = (part: string) => `home/x/${part}`;
function setup(c: Name, input: object, state: StateName = "filled") {
  const onLink = vi.fn();
  const controller = createScreenController({
    defs: components,
    screen: { id: "home", components: [{ id: "x", c, ...input, state }] },
    onLink,
  });
  return { controller, onLink };
}

it.each([
  ["Loans", { loans: [loan] }],
  ["Storage", storage],
  ["Things", { items: [row] }],
] as const)("%s keeps the standard empty message treatment under a local density override", (id, input) => {
  expect(draw(id, { ...input, density: "compact" }, "empty").get(at("empty"))).toEqual(
    draw(id, input, "empty").get(at("empty")),
  );
});

describe("Things checklist and audit counts", () => {
  it("projects the missing checklist from live counts without changing addresses", () => {
    const input = {
      filter: "missing",
      items: [
        { ...row, qty: 1 },
        { ...row, qty: 0 },
      ],
    };
    expect(draw("Things", input).has(at("r1/root"))).toBe(false);
    expect(draw("Things", input).has(at("r2/root"))).toBe(true);
    const { controller } = setup("Things", input);
    expect(controller.read()).toContain("[x/r2 press→tray]");
    expect(controller.read()).not.toContain("x/r1");
    expect(controller.act({ address: "x/r2/qty", action: "increment" }).ok).toBe(true);
    expect(controller.read()).toContain("No missing items");
    expect(controller.actionsAt("x/r2/qty")).toEqual([]);
  });

  it("keeps serial, condition and audit counts scoped to their items and only reads shown figures", () => {
    const input = {
      style: "audit",
      items: [
        { ...row, serial: "LEDGE-042", condition: "worn", expected: 0 },
        { ...row, qty: max },
      ],
    };
    const parts = draw("Things", input);
    expect(parts.get(at("r1/serial"))?.text).toEqual(["Serial: LEDGE-042"]);
    expect(parts.get(at("r1/condition"))?.text).toEqual(["Worn"]);
    expect(parts.get(at("r1/expected"))?.text).toEqual(["0"]);
    expect(parts.get(at("r1/counted"))?.text).toEqual(["Counted"]);
    expect(parts.has(at("r2/expected"))).toBe(false);
    expect(hasStepTarget(parts.get(at("r2/qty"))!, "decrement")).toBe(true);
    expect(draw("Things", { items: input.items }).has(at("r1/expected"))).toBe(false);
    expect(draw("Things", input, "loading").has(at("r1/counted"))).toBe(false);
    const { controller } = setup("Things", input);
    expect(controller.read()).toContain("Expected: 0 · Counted: 2 · Worn · Serial: LEDGE-042");
    expect(controller.act({ address: "x/r1/qty", action: "decrement" }).ok).toBe(true);
    expect(controller.read()).toContain("Expected: 0 · Counted: 1");
  });
});

describe("Things scan, loading and schema", () => {
  it("offers an OK-tier scan link even with no matching rows, but never opens the camera directly", () => {
    const input = { items: [row], filter: "missing", scan };
    const { controller, onLink } = setup("Things", input);
    expect(draw("Things", input).get(at("scan_label"))?.text).toEqual(["Scan a barcode or QR code"]);
    expect(controller.read()).toContain("[x/scan press→scan_inventory !needs-ok]");
    expect(controller.press("x/scan").ok).toBe(true);
    expect(onLink).toHaveBeenCalledExactlyOnceWith("scan_inventory", at("scan"));
    for (const state of ["empty", "loading"] as const) {
      expect(draw("Things", input, state).has(at("scan"))).toBe(false);
      expect(setup("Things", input, state).controller.press("x/scan").ok).toBe(false);
    }
    expect(setup("Things", { items: [row] }).controller.press("x/scan").ok).toBe(false);
  });

  it("announces a shaped audit loading state without offering quantity or scan targets", () => {
    const input = { style: "audit", scan, items: [{ ...row, expected: 8 }] };
    const html = renderInstance("Things", input, "loading", theme, { component: "x" });
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-label="Loading"');
    expect([...addressedElements(html).keys()]).toEqual([at("root"), at("r1/tile")]);
    const { controller } = setup("Things", input, "loading");
    expect(controller.actionsAt("x/r1/qty")).toEqual([]);
    expect(controller.actionsAt("x/scan")).toEqual([]);
  });

  it("bounds audit and metadata fields and accepts only a local screen id for scanning", () => {
    const { props } = components.Things;
    expect(
      props.safeParse({ items: [{ ...row, expected: max, serial: "X".repeat(24), condition: "damaged" }] })
        .success,
    ).toBe(true);
    for (const patch of [
      { expected: -1 },
      { expected: 2.5 },
      { expected: max + 1 },
      { serial: "X".repeat(25) },
      { condition: "broken" },
    ])
      expect(props.safeParse({ items: [{ ...row, ...patch }] }).success).toBe(false);
    expect(props.safeParse({ items: [row], scan: { goto: "https://example.org" } }).success).toBe(false);
  });
});

describe("Storage options", () => {
  it("renders and reads a moving box even when it contains nothing", () => {
    const input = { ...storage, code: "TROT-08", fragile: true, status: "in_transit", detail: "brief" };
    const parts = draw("Storage", input);
    expect(parts.has(at("empty"))).toBe(false);
    expect(parts.get(at("code"))?.text).toEqual(["Box code: TROT-08"]);
    expect(parts.get(at("qr"))?.attributes).toContain('aria-label="QR code for box TROT-08"');
    expect(parts.get(at("status"))?.text).toEqual(["In transit"]);
    expect(parts.get(at("fragile"))?.text).toEqual(["Fragile"]);
    const { controller } = setup("Storage", input);
    expect(controller.read()).toContain("Box code: TROT-08 — In transit — Fragile — Stored here");
    expect(controller.press("x/qr").ok).toBe(false);
    expect(draw("Storage", input, "empty").has(at("qr"))).toBe(false);
    expect(draw("Storage", { ...input, fragile: false }).has(at("fragile"))).toBe(false);
  });

  it("validates optional moving-box fields independently", () => {
    const { props } = components.Storage;
    for (const status of ["packing", "sealed", "in_transit", "unpacked"])
      expect(props.safeParse({ ...storage, status }).success).toBe(true);
    expect(props.safeParse({ ...storage, code: "X".repeat(24) }).success).toBe(true);
    for (const patch of [{ code: "X".repeat(25) }, { fragile: "true" }, { status: "lost" }])
      expect(props.safeParse({ ...storage, ...patch }).success).toBe(false);
  });
});

describe("Loans options", () => {
  it("shows independent notes in brief view without changing the return or reminder actions", () => {
    const input = {
      detail: "brief",
      loans: [
        { ...loan, conditionOut: "Clean" },
        { ...loan, conditionIn: "Minor nick" },
      ],
    };
    const parts = draw("Loans", input);
    expect(parts.get(at("r1/condition_out"))?.text).toEqual(["At checkout: Clean"]);
    expect(parts.has(at("r1/condition_in"))).toBe(false);
    expect(parts.has(at("r2/condition_out"))).toBe(false);
    expect(parts.get(at("r2/condition_in"))?.text).toEqual(["On return: Minor nick"]);
    expect(parts.has(at("r1/since"))).toBe(false);
    const { controller } = setup("Loans", input);
    expect(controller.read()).toContain("r2 Lent to Ana · On return: Minor nick · Mark returned");
    expect(controller.read()).toContain("[x/r2/remind press !needs-service]");
    expect(controller.press("x/r2/returned").ok).toBe(true);
    expect(controller.confirmation?.source).toBe(at("r2/returned"));
  });

  it("bounds both notes and rejects blanks", () => {
    const { props } = components.Loans;
    for (const key of ["conditionOut", "conditionIn"]) {
      expect(props.safeParse({ loans: [{ ...loan, [key]: "X".repeat(48) }] }).success).toBe(true);
      for (const value of [" ", "X".repeat(49)])
        expect(props.safeParse({ loans: [{ ...loan, [key]: value }] }).success).toBe(false);
    }
  });
});
