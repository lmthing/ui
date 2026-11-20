import { describe, expect, expectTypeOf, it } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  planAct,
  placeholderTitle,
  readComponent,
  readScreen,
  type CastLike,
  type StateName,
} from "@lmthing/ui/catalog";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.RequestQueue;
const [active, finished] = def.examples;
const ticket = active!.rows[0]!;
const closed = finished!.rows[0]!;
const mixed = { rows: [closed, ...active!.rows] };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const address = (part: string) => `home/q1/${part}`;
const draw = (input: unknown, state: StateName = "filled") =>
  renderInstance("RequestQueue", input, state, theme, { component: "q1", thing: "request" });

describe("RequestQueue contract", () => {
  it.each(def.examples)("accepts a domain example", (example) =>
    expect(def.props.safeParse(example).success).toBe(true),
  );
  it("defaults to active with status sections and keeps exactly six bounded records", () => {
    expect(def.props.parse({ rows: [ticket] })).toMatchObject({ view: "active", group: "sections" });
    expect(def.props.safeParse({ rows: Array(6).fill(ticket) }).success).toBe(true);
    expectTypeOf<typeof ticket.title>().toEqualTypeOf<string>();
  });
  it.each([
    { rows: [] },
    { rows: Array(7).fill(ticket) },
    { view: "all" },
    { group: "chronological" },
    { density: "large" },
    { color: "red" },
    { count: 10 },
    { now: 42 },
    { addressed_rows: [] },
    ...[
      { title: "x".repeat(33) },
      { number: "x".repeat(13) },
      { place: "x".repeat(37) },
      { who: "x".repeat(25) },
      { status: "lost" },
      { urgency: "critical" },
      { opened: "2026-02-30" },
      { openedAt: "25:00" },
      { due: undefined },
      { goto: "Invalid link" },
      { id: "r1" },
      { inView: true },
    ].map((edit) => ({ rows: [{ ...ticket, ...edit }] })),
  ])("rejects invalid or code-owned props", (edit) =>
    expect(def.props.safeParse({ rows: [ticket], ...edit }).success).toBe(false),
  );
  it("keeps pack gating and the core near miss, variant write and addressed read probes", () => {
    const live = createRegistry({ packs: ["requests"] });
    expect(live.ids.includes("RequestQueue")).toBe(packReady("requests"));
    expect(def.meta.tier).toBe("phone");
    expect(def.meta.realPath).not.toBe("");
    expect(def.probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "RequestQueue" }),
        expect.objectContaining({ kind: "choose", expect: "List" }),
        expect.objectContaining({ kind: "write", variant: { axis: "group", value: "none" } }),
        expect.objectContaining({ kind: "read", expect: { address: "r1/r1", action: "press" } }),
      ]),
    );
  });
});

describe("RequestQueue fallback", () => {
  it("uses cast content when available and neutral placeholders otherwise", () => {
    const empty = { things: [], items: [] };
    const things = [{ type: "report", fields: ["title", "place"] }];
    const valid = { id: "a", sample: true, type: "report", title: "Loose shelf", place: "West wing" };
    const casts: CastLike[] = [
      empty,
      { things, items: [valid] },
      { things, items: [{ ...valid, title: 9, place: " " }] },
      { things, items: Array(8).fill(valid) },
    ];
    for (const cast of casts) expect(def.props.safeParse(def.fallback({ cast })).success).toBe(true);
    expect(def.fallback({ cast: casts[0]! }).rows[0]?.title).toBe(placeholderTitle(0));
    expect(def.fallback({ cast: casts[1]! }).rows[0]).toMatchObject({
      title: valid.title,
      place: valid.place,
    });
    expect(def.fallback({ cast: casts[2]! }).rows[0]?.title).toBe(placeholderTitle(0));
    expect(def.fallback({ cast: casts[3]! }).rows).toHaveLength(3);
  });
});

describe("RequestQueue states and parts", () => {
  it("renders only the selected lifecycle view and retains original item parts", () => {
    const first = addressedElements(draw(mixed));
    expect(first.get(address("view"))?.attributes).toContain('role="radiogroup"');
    expect(first.get(address("r2/root"))?.attributes).toContain('role="link"');
    for (const part of ["number", "title", "place", "status", "urgency", "who", "age", "due"])
      expect(first.has(address(`r2/${part}`))).toBe(true);
    for (const part of ["place", "who", "due"]) expect(first.has(address(`r3/${part}`))).toBe(false);
    expect(first.has(address("r1/root"))).toBe(false);
    expect(first.has(address("status_heading"))).toBe(true);
    const second = draw({ ...mixed, view: "completed", group: "none", density: "compact" });
    const parts = addressedElements(second);
    expect(parts.has(address("r1/root"))).toBe(true);
    expect(parts.has(address("r2/root"))).toBe(false);
    expect(parts.has(address("status_heading"))).toBe(false);
    expect(second).toContain("1 request");
  });

  it.each(["empty", "loading", "error"] as const)("renders no stale rows in the %s state", (state) => {
    const html = draw(mixed, state);
    const parts = addressedElements(html);
    expect(parts.has(address("root"))).toBe(true);
    expect(parts.has(address("r2/root"))).toBe(false);
    expect(parts.has(address("view"))).toBe(state === "empty");
    expect(parts.has(address("empty"))).toBe(state === "empty");
    expect(parts.has(address("error"))).toBe(state === "error");
    expect(parts.has(address("retry"))).toBe(state === "error");
    expect(html).not.toContain(ticket.title);
  });

  it("shows a view-specific empty message after filtering out every row", () => {
    const html = draw({ ...active, view: "completed" });
    expect(html).toContain("No completed requests");
    expect(html).toContain("0 requests");
    expect(html).not.toContain(ticket.title);
  });
});

const selection = { address: "q1/view", action: "select", value: "completed" };
const activeRow = { address: "q1/r2", action: "press" };
const completedRow = { address: "q1/r1", action: "press" };
const retry = { address: "q1/retry", action: "press" };
const screen = (state: StateName) => ({
  id: "home",
  components: [{ id: "q1", c: "RequestQueue", state, ...mixed }],
});
const plan = (state: StateName, ...steps: (typeof selection | typeof activeRow)[]) =>
  planAct(screen(state), components, {}, steps);

describe("RequestQueue read and act", () => {
  it.each(["filled", "empty", "loading", "error"] as const)("gates every action in %s", (state) => {
    const reading = readComponent(def, mixed, "q1", state).join("\n");
    expect(reading.includes("[q1/retry press]")).toBe(state === "error");
    expect(reading.includes("[q1/view select")).toBe(state === "filled" || state === "empty");
    expect(reading.includes("[q1/r2 press")).toBe(state === "filled");
    expect(reading).not.toContain(closed.title);
    expect(plan(state, retry).ok).toBe(state === "error");
    expect(plan(state, selection).ok).toBe(state === "filled" || state === "empty");
    expect(plan(state, activeRow).ok).toBe(state === "filled");
    expect(plan(state, completedRow).ok).toBe(false);
  });

  it("projects the named selection before admitting the next press", () => {
    const selected = plan("filled", selection, completedRow);
    expect(selected).toMatchObject({ ok: true, links: [{ goto: closed.goto }] });
    if (!selected.ok) return;
    expect(plan("filled", selection, activeRow)).toMatchObject({ ok: false, code: "not_actionable" });
    expect(plan("filled", { ...selection, value: "all" }).ok).toBe(false);
    const reading = readScreen(screen("filled"), components, selected.values);
    expect(reading).toContain("[q1/r1 press");
    expect(reading).not.toContain("[q1/r2 press");
    expect(reading).not.toContain(ticket.title);
  });

  it("reads the host's active overflow and localized total, not the completed overflow", () => {
    const data = { requestQueue: [{ overflow: { active: 4, completed: 9 } }] };
    const reading = readComponent(def, mixed, "q1", "filled", {}, "ar-u-nu-arab", data).join("\n");
    expect(reading).toContain("٦ requests");
    expect(reading).toContain("and ٤ more");
    expect(reading).not.toContain("and ٩ more");
  });
});
