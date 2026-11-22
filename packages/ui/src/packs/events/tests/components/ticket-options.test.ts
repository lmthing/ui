import { expect, it, vi } from "vitest";
import { components, readComponent, type StateName } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance, styleAt } from "../../../../../test/render";

const { Ticket } = components;
const input = Ticket.examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const parts = (given: unknown, state: StateName = "filled") =>
  addressedElements(renderInstance("Ticket", given, state, theme, { component: "t1" }));
const read = (given: unknown, state: StateName = "filled") =>
  readComponent(Ticket, given, "t1", state).join("\n");
const mount = (given: ReturnType<typeof Ticket.fallback>, state: StateName = "filled", onAction = vi.fn()) =>
  createScreenController({
    screen: { id: "home", components: [{ ...given, id: "t1", c: "Ticket", state }] },
    defs: { Ticket },
    onAction,
  });

it.each(["badge", "pass"] as const)("renders assigned seats independently in the %s style", (style) => {
  const given = { ...input, style, section: "Balcony", seat: "12", status: "valid" };
  const html = parts(given);
  expect(html.get("home/t1/section")?.text).toEqual(["Section Balcony"]);
  expect(html.get("home/t1/seat")?.text).toEqual(["Seat 12"]);
  expect(html.has("home/t1/row")).toBe(false);
  expect(html.get("home/t1/status")?.text).toEqual(["Valid"]);
  expect(html.get("home/t1/code")?.children.some(({ tag }) => tag === "svg")).toBe(true);
  expect(read(given)).toContain("Section Balcony · Seat 12");
  expect(read(given)).toContain("Valid");
  expect(read(given)).not.toContain("t1/transfer");
});

it.each(["comfortable", "compact"] as const)(
  "uses the date's text size for the bold ticket number in %s",
  (density) => {
    const html = renderInstance("Ticket", { ...input, density }, "filled", theme, { component: "t1" });
    const date = styleAt(html, "home/t1/date").match(/font-size:[^;!]+/)?.[0];
    const number = styleAt(html, "home/t1/number");
    expect(date).toBeDefined();
    expect(number).toContain(date);
    expect(number).toContain("font-weight:700");
  },
);

it.each([
  { section: "x".repeat(17) },
  { row: "x".repeat(13) },
  { seat: 12 },
  { status: "expired" },
  { transfer: "yes" },
  { canTransfer: true },
])("rejects invalid option fields %o", (option) => {
  expect(Ticket.props.safeParse({ ...input, ...option }).success).toBe(false);
});

it("dispatches the opt-in transfer at the people tier", () => {
  const onAction = vi.fn();
  const given = { ...input, transfer: true };
  expect(parts(given).get("home/t1/transfer_label")?.text).toEqual(["Transfer ticket"]);
  expect(read(given)).toContain("[t1/transfer press !needs-people]");
  expect(mount(given, "filled", onAction).press("t1/transfer").ok).toBe(true);
  expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: "home/t1/transfer", action: "press" });
});

it.each([
  { status: "used", state: "filled", label: "Used" },
  { status: "transferred", state: "filled", label: "Transferred" },
  { status: "transferred", state: "success", label: "Transferred" },
  { status: "valid", state: "success", label: "Scanned in" },
] as const)("blocks scan and transfer for $status in $state", ({ status, state, label }) => {
  const given = { ...input, status, transfer: true };
  const html = parts(given, state);
  expect(html.get("home/t1/code")?.children.some(({ tag }) => tag === "svg")).toBe(false);
  expect(html.has("home/t1/hint")).toBe(false);
  expect(html.has("home/t1/transfer")).toBe(false);
  expect(read(given, state)).toContain(label);
  if (state === "success") expect(read(given, state)).not.toContain("Valid");
  expect(read(given, state)).not.toContain("t1/transfer");
  expect(read(given, state)).not.toContain("Show this code");
  expect(mount(given, state).press("t1/transfer").ok).toBe(false);
});
