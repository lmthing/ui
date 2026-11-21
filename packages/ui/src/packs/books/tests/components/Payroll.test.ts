import { describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import * as c from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements } from "../../../../../test/render";
import { renderPayrollExample } from "./payroll-fixture";

const def = c.components.Payroll;
const { meta, props, examples, fallback, probes } = def;
type Input = z.input<typeof props>;
const draft: Input = examples[0]!;
const paid: Input = examples[1]!;
const hourly = draft.payees[0]!;

describe("Payroll contract and boundaries", () => {
  it.each(examples)("parses each example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it.each([
    { payees: [] },
    { payees: [hourly, hourly] },
    { payees: [{ ...hourly, employeeRef: "Bad ref" }] },
    { payees: [{ ...hourly, ruleRef: "x".repeat(33) }] },
    { payees: [{ ...hourly, name: "x".repeat(25) }] },
    { payees: [{ ...hourly, basis: "weekly" }] },
    { payees: [{ ...hourly, hours: undefined }] },
    { payees: [{ ...hourly, hours: -1 }] },
    { payees: [{ ...hourly, hours: 745 }] },
    { payees: [{ ...hourly, basis: "salary" }] },
    { payees: [{ ...hourly, rate: -1 }] },
    { payees: [{ ...hourly, gross: 120 }] },
    { payees: [{ ...hourly, visible: true }] },
    { payees: [{ ...hourly, adjustments: [{ label: "Correction", amount: -121 }] }] },
    { payees: [{ ...hourly, adjustments: [{ label: "x".repeat(21), amount: 1 }] }] },
    {
      payees: [{ ...hourly, adjustments: Array.from({ length: 4 }, () => ({ label: "Bonus", amount: 1 })) }],
    },
    { payees: [{ ...hourly, paidAt: "2026-12-01T12:00:00Z" }] },
    { finalizedAt: "2026-12-01T09:00:00" },
    { finalizedAt: "2026-12-01T13:00:00Z", payees: paid.payees },
    { finalizedAt: paid.finalizedAt, payees: paid.payees, voided: true },
    { to: "2027-11-02" },
    { from: "2026-12-01" },
    { style: "table" },
    { detail: "hidden" },
    { color: "#ff0000" },
  ])("rejects an invalid seed %o", (patch) => {
    expect(props.safeParse({ ...draft, ...patch }).success).toBe(false);
  });

  it("accepts the exact row, reference, label, hours and adjustment bounds", () => {
    const payees = Array.from({ length: 7 }, (_, index) => ({
      ...hourly,
      employeeRef: `${"x".repeat(31)}${index}`,
      name: "x".repeat(24),
      hours: 744,
      adjustments: Array.from({ length: 3 }, () => ({ label: "x".repeat(20), amount: 1 })),
    }));
    expect(props.safeParse({ ...draft, payees: payees.slice(1) }).success).toBe(true);
    expect(props.safeParse({ ...draft, payees }).success).toBe(false);
  });
});

describe("Payroll metadata and fallback", () => {
  it("preserves the People near miss, the brief write probe, and pack readiness", () => {
    expect(meta).toMatchObject({ dense: true, weight: 3, tier: "phone", partTiers: { send: "service" } });
    expect(meta.confirmParts).toEqual(["finalize", "void"]);
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "People" }));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Payroll" }));
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
    );
    expect(probes.filter(({ kind }) => kind === "read")).toHaveLength(2);
    expect(c.createRegistry({ packs: ["books"] }).ids.includes(meta.id)).toBe(c.packReady("books"));
  });
  it.each([
    ["Fern", "Fern"],
    [42, "Item one"],
    [undefined, "Item one"],
  ])("uses cast content or a neutral placeholder", (name, expected) => {
    const cast = {
      things: [{ type: "plant", fields: ["name"] }],
      items: name === undefined ? [] : [{ id: "fern", type: "plant", sample: true, name }],
    };
    expect(props.parse(fallback({ cast })).payees[0]?.name).toBe(expected);
  });
});

function screen(input: Input, state: c.StateName = "filled") {
  const { html, deviceData } = renderPayrollExample(input, state);
  const parts = addressedElements(html);
  const read = c.readComponent(def, input, "c1", state, {}, undefined, deviceData).join("\n");
  return { html, parts, read };
}

describe("Payroll screen and read/act parity", () => {
  const final: Input = { ...draft, finalizedAt: paid.finalizedAt };
  const partlyPaid: Input = {
    ...final,
    payees: [{ ...hourly, paidAt: paid.payees[0]!.paidAt }, draft.payees[1]!],
  };

  it.each([
    ["draft", draft, "filled", ["finalize", "void", "r1", "r2"]],
    ["draft success", draft, "success", ["void", "r1", "r1/record", "r1/send", "r2", "r2/record", "r2/send"]],
    ["finalised", final, "success", ["void", "r1", "r1/record", "r1/send", "r2", "r2/record", "r2/send"]],
    ["partly paid", partlyPaid, "filled", ["r1", "r1/send", "r2", "r2/record", "r2/send"]],
    ["paid payslip", paid, "success", ["r1/send"]],
    ["voided", { ...final, voided: true }, "filled", ["r1", "r2"]],
  ] satisfies [string, Input, c.StateName, string[]][])(
    "offers exactly the drawn controls: %s",
    (_case, input, state, expected) => {
      const { parts, read } = screen(input, state);
      expect([...read.matchAll(/\[c1\/(\S+) press/g)].map(([, address]) => address).sort()).toEqual(
        expected.sort(),
      );
      expect(
        [...parts]
          .filter(([, element]) => element.attributes.includes('role="button"'))
          .map(([address]) => address.replace("home/c1/", "").replace(/\/root$/, ""))
          .sort(),
      ).toEqual(expected);
      if (expected.includes("r1/send")) expect(read).toContain("[c1/r1/send press !needs-service]");
    },
  );
});

describe("Payroll parts and states", () => {
  it("shows the host-selected payslip without offering hidden payees or hiding drafted inputs from the seed", () => {
    const final: Input = { ...draft, finalizedAt: paid.finalizedAt };
    const input = { ...final, style: "payslip", detail: "brief" } as const;
    const { parts, read } = screen(input);
    expect(props.parse(input).payees).toHaveLength(2);
    expect(parts.has("home/c1/r2/root")).toBe(true);
    expect([...parts.keys()].some((id) => id.startsWith("home/c1/r1/"))).toBe(false);
    expect(parts.has("home/c1/r2/basis")).toBe(false);
    expect(parts.has("home/c1/r2/rate")).toBe(false);
    expect(parts.has("home/c1/r2/hours")).toBe(false);
    expect(parts.get("home/c1/r2/net_pay")?.text).toContain("£544");
    expect(read).toContain("£544");
    expect(read).not.toContain("£12/hr");
    expect(read).not.toContain("r1");
  });

  it("shows the run totals, dates, and selected payslip breakdown at their declared parts", () => {
    const run = screen(draft).parts;
    const slip = screen(paid).parts;
    expect(run.get("home/c1/net_pay")?.text).toContain("£646");
    expect(run.get("home/c1/r1/hours")?.text.join("").trim()).toContain("10 h");
    for (const part of ["from", "to", "pay_date", "gross", "deductions", "employer_cost"])
      expect(run.has(`home/c1/${part}`)).toBe(true);
    for (const part of ["adjustments", "gross", "deductions", "net_pay", "employer_cost", "paid"])
      expect(slip.has(`home/c1/r1/${part}`)).toBe(true);
  });

  it.each(["empty", "loading", "error"] as const)("omits payroll content and controls in %s", (state) => {
    const { html, parts, read } = screen(draft, state);
    if (state !== "loading") expect(html).not.toContain(hourly.name);
    else expect(html).toContain('aria-label="Loading"');
    expect(parts.has("home/c1/finalize")).toBe(false);
    expect(parts.has("home/c1/r1/root")).toBe(false);
    expect(read).not.toContain(hourly.name);
    expect(read).not.toContain(" press");
  });
});

it.each(["finalize", "void"])("dispatches %s only after confirmation", (part) => {
  const onAction = vi.fn();
  const { deviceData } = renderPayrollExample(draft, "filled");
  const run = createScreenController({
    screen: { id: "home", components: [{ ...draft, c: meta.id, id: "c1" }] },
    defs: { Payroll: def },
    deviceData,
    onAction,
  });
  try {
    expect(run.press(`c1/${part}`).ok).toBe(true);
    expect(run.read()).toContain("[confirm/confirm press]");
    expect(onAction).not.toHaveBeenCalled();
    expect(run.press("confirm/cancel").ok).toBe(true);
    expect(onAction).not.toHaveBeenCalled();
    expect(run.press(`c1/${part}`).ok).toBe(true);
    expect(run.press("confirm/confirm").ok).toBe(true);
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: `home/c1/${part}`, action: "press" });
  } finally {
    run.dispose();
  }
});
