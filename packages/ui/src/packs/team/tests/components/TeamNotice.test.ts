import { expect, it, vi } from "vitest";
import { components, createRegistry, packReady, readComponent } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.TeamNotice;
const { examples, fallback, props } = def;
const full = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

it.each(examples)("accepts workplace bulletins", (example) => {
  expect(props.safeParse(example).success).toBe(true);
});

it("enforces authored limits, bounded counts and valid link targets", () => {
  expect(props.safeParse({ ...full, body: "a".repeat(400), readCount: 18 }).success).toBe(true);
  for (const bad of [
    { title: "a".repeat(49) },
    { by: "a".repeat(25) },
    { postedAt: "a".repeat(17) },
    { body: "a".repeat(401) },
    { totalMembers: 0 },
    { readCount: -1 },
    { readCount: 1.5 },
    { readCount: 19 },
    { goto: "Bad ID" },
    { priority: "high" },
    { unread: 2 },
  ])
    expect(props.safeParse({ ...full, ...bad }).success).toBe(false);
});

it("uses cast headings or neutral fallbacks and follows team readiness", () => {
  const cast = { things: [], items: [] };
  expect(props.safeParse(fallback({ cast })).success).toBe(true);
  const item = { id: "note", type: "notice", name: "Delivery note", sample: true };
  expect(fallback({ cast: { ...cast, items: [item] } }).title).toBe("Delivery note");
  expect(createRegistry({ packs: ["team"] }).ids.includes("TeamNotice")).toBe(packReady("team"));
});

it("hides bulletin-only parts and reading in the pinned strip", () => {
  const html = renderInstance("TeamNotice", full, "filled", theme);
  const brief = { ...full, detail: "brief" };
  const strip = renderInstance("TeamNotice", brief, "filled", theme);
  for (const part of ["author", "posted", "body", "count", "ack", "ack_label"]) {
    expect(addressedElements(html).has(`home/c1/${part}`)).toBe(true);
    expect(addressedElements(strip).has(`home/c1/${part}`)).toBe(false);
  }
  const summary = readComponent(def, brief, "t1").join("\n");
  expect(summary).toContain(full.title);
  expect(summary).not.toContain(full.body);
  expect(summary).not.toContain("14 of 18");
});

it("records the receipt once, updates the live reading and never navigates on ack", () => {
  const onLink = vi.fn();
  const screen = { id: "home", components: [{ ...full, c: "TeamNotice", id: "t1" }] };
  const runtime = createScreenController({ screen, defs: components, onLink });
  expect(runtime.press("t1/ack")).toMatchObject({ ok: true });
  expect(runtime.press("t1/ack")).toMatchObject({ ok: false });
  const reading = runtime.read();
  expect(reading).toContain("15 of 18 read");
  expect(reading).toContain("3 unread");
  expect(reading).not.toContain("[t1/ack check");
  expect(onLink).not.toHaveBeenCalled();
  expect(runtime.press("t1")).toMatchObject({ ok: true });
  expect(onLink).toHaveBeenCalledWith("access_notice", "home/t1");
  runtime.dispose();
});

it.each([
  { state: "filled", change: { requireAck: false }, link: true },
  { state: "filled", change: { acknowledged: true }, link: true },
  { state: "filled", change: { detail: "brief" }, link: true },
  { state: "filled", change: { acknowledged: true, goto: undefined }, link: false },
  { state: "loading", change: {}, link: false },
  { state: "success", change: {}, link: true },
] as const)("gates receipt and navigation for $state / $change", ({ state, change, link }) => {
  const input = { ...full, ...change };
  const screen = { id: "home", components: [{ ...input, c: "TeamNotice", id: "t1", state }] };
  const runtime = createScreenController({ screen, defs: components });
  expect(runtime.press("t1/ack")).toMatchObject({ ok: false });
  expect(runtime.press("t1")).toMatchObject({ ok: link });
  runtime.dispose();
  const html = renderInstance("TeamNotice", input, state, theme);
  if (state === "success") {
    expect(html).toContain("Read receipt recorded");
    expect(html).toMatch(/>15<[^]*> of <[^]*>18<[^]*> read</);
  }
  if (state === "loading") expect(html).toContain('aria-busy="true"');
});
