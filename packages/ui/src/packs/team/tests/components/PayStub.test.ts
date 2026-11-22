import { expect, it, vi } from "vitest";
import { components, createRegistry, packReady, readComponent } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.PayStub;
const { examples, fallback, props, meta } = def;
const full = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

it.each(examples)("accepts an issued statement", (example) => {
  expect(props.safeParse(example).success).toBe(true);
});

it("bounds both lists and validates dates, amounts and the read-only wire contract", () => {
  const line = { label: "x".repeat(24), amount: 0 };
  const six = Array.from({ length: 6 }, () => line);
  expect(props.safeParse({ ...full, earnings: six, deductions: six }).success).toBe(true);
  for (const change of [
    { earnings: [] },
    { earnings: [...six, line] },
    { deductions: [...six, line] },
    { earnings: [{ ...line, rate: -1 }] },
    { deductions: [{ ...line, amount: -1 }] },
    { periodTo: "2026-10-31" },
    { payDate: "2026-02-30" },
    { net: 0 },
    { ytdGross: -1 },
  ])
    expect(props.safeParse({ ...full, ...change }).success).toBe(false);
});

it("falls back to bounded cast values and follows team readiness", () => {
  const cast = { things: [], items: [] };
  expect(props.safeParse(fallback({ cast })).success).toBe(true);
  const person = { id: "one", type: "staff", sample: true, name: "Lee" };
  expect(fallback({ cast: { ...cast, items: [person] } }).employee).toBe("Lee");
  expect(createRegistry({ packs: ["team"] }).ids.includes("PayStub")).toBe(packReady("team"));
});

it("renders and reads computed amounts, omitting the itemization in brief", () => {
  const html = renderInstance("PayStub", full, "filled", theme);
  expect(html).toContain("$1,044.48");
  for (const part of ["earnings", "deductions", "ytd_gross", "ytd_net", "net", "export"])
    expect(addressedElements(html).has(`home/c1/${part}`)).toBe(true);
  const brief = { ...full, detail: "brief" };
  const summary = renderInstance("PayStub", brief, "filled", theme);
  expect(summary).toContain("$1,044.48");
  const reading = readComponent(def, brief, "p1").join("\n");
  expect(reading).toContain("Net pay: $1,044.48");
  for (const text of ["Regular hours", "Income tax", "Year-to-date net", "Rae"]) {
    expect(summary).not.toContain(text);
    expect(reading).not.toContain(text);
  }
});

it.each(["filled", "empty", "loading", "error"] as const)(
  "offers service export only in %s when filled",
  (state) => {
    const onAction = vi.fn();
    const screen = { id: "home", components: [{ ...full, id: "p1", c: "PayStub", state }] };
    const runtime = createScreenController({ screen, defs: components, onAction });
    expect(meta.partTiers.export).toBe("service");
    expect(runtime.press("p1/export")).toMatchObject({ ok: state === "filled" });
    expect(runtime.press("p1/net")).toMatchObject({ ok: false });
    expect(onAction).toHaveBeenCalledTimes(state === "filled" ? 1 : 0);
    runtime.dispose();
    const html = renderInstance("PayStub", full, state, theme);
    if (state === "empty") expect(html).toContain("No pay statements issued yet");
    if (state === "error") expect(html).toContain("Pay statement unavailable");
    if (state === "loading") expect(html).toContain('aria-busy="true"');
  },
);
