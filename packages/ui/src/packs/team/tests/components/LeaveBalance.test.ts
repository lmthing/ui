import { expect, it } from "vitest";
import { components, createRegistry, packReady, readComponent } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.LeaveBalance;
const { examples, fallback, props } = def;
const full = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

it.each(examples)("parses domain examples", (example) => {
  expect(props.safeParse(example).success).toBe(true);
});

it("bounds balances, dates, caps and links, and derives rather than accepts available leave", () => {
  const row = { label: "x".repeat(20), accrued: 0, used: 2, pending: 1 };
  expect(props.safeParse({ balances: Array.from({ length: 6 }, () => row) }).success).toBe(true);
  for (const bad of [
    { label: "x".repeat(21) },
    { pending: -1 },
    { cap: 0 },
    { expiresOn: "2026-02-30" },
    { goto: "Bad ID" },
    { available: 0 },
  ])
    expect(props.safeParse({ balances: [{ ...row, ...bad }] }).success).toBe(false);
  for (const size of [0, 7])
    expect(props.safeParse({ balances: Array.from({ length: size }, () => row) }).success).toBe(false);
});

it("uses neutral or cast-derived fallbacks and follows team pack readiness", () => {
  const cast = { things: [], items: [] };
  expect(props.safeParse(fallback({ cast })).success).toBe(true);
  const item = { id: "leave", type: "category", name: "Annual leave", sample: true };
  expect(fallback({ cast: { ...cast, items: [item] } }).balances[0]?.label).toBe("Annual leave");
  expect(createRegistry({ packs: ["team"] }).ids.includes("LeaveBalance")).toBe(packReady("team"));
});

it("renders breakdown parts in full, but only type and available amount in brief", () => {
  const addresses = (input: unknown) =>
    addressedElements(renderInstance("LeaveBalance", input, "filled", theme));
  const standard = addresses(full);
  for (const part of ["type", "accrued", "available", "used", "pending", "expires"])
    expect(standard.has(`home/c1/r1/${part}`)).toBe(true);
  const brief = { ...full, detail: "brief" };
  const visible = addresses(brief);
  expect(visible.has("home/c1/r1/available")).toBe(true);
  expect(visible.has("home/c1/r1/pending")).toBe(false);
  expect(readComponent(def, brief, "l1").join("\n")).toContain("Vacation: 48 h available");
});

it.each(["filled", "empty", "loading"] as const)("gates row links and requests in %s", (state) => {
  const screen = {
    id: "home",
    components: [{ ...full, id: "l1", c: "LeaveBalance", state }],
    links: [{ goto: "vacation" }],
  };
  const runtime = createScreenController({ screen, defs: components });
  expect(runtime.press("l1/request")).toMatchObject({ ok: state === "filled" });
  expect(runtime.press("l1/r1")).toMatchObject({ ok: state === "filled" });
  expect(runtime.press("l1/r2")).toMatchObject({ ok: false });
  runtime.dispose();
  const html = renderInstance("LeaveBalance", full, state, theme);
  if (state === "empty") expect(html).toContain("No leave balances assigned");
  if (state === "loading") expect(html).toContain('aria-busy="true"');
});
