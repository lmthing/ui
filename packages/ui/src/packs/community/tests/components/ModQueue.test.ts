import { describe, expect, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  readComponent,
  type CommandRequest,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.ModQueue;
const { meta, props, examples, fallback, probes } = def;
const input = examples[0]!;
const join = input.items[0]!;
const flagged = input.items[1]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const at = (part: string) => `home/m1/${part}`;
const defs = { ModQueue: def };
const screenOf = (seed = input) => ({ id: "home", components: [{ ...seed, c: meta.id, id: "m1" }] });
const approve = "r1/approve";
const decline = "r1/decline";
const remove = "r2/remove";

// prettier-ignore
describe("ModQueue contract", () => {
  it.each(examples)("accepts a domain example", (example) => expect(props.safeParse(example).success).toBe(true));

  it("accepts exact bounds and rejects invalid values and runtime fields", () => {
    const item = { ...join, author: "a".repeat(24), summary: "s".repeat(120),
      detail: "d".repeat(200), reason: "r".repeat(32), submittedAt: "2024-02-29T09:00:00+01:00" };
    const items = Array.from({ length: 12 }, (_, i) => ({ ...item, id: `${"x".repeat(22)}${i.toString().padStart(2, "0")}` }));
    const rules = Array.from({ length: 6 }, (_, i) => `${"x".repeat(31)}${i}`);
    expect(props.parse({ items, rules })).toMatchObject({ style: "mixed", detail: "full" });
    expect(props.safeParse({ items: [], rules }).success).toBe(true);
    for (const patch of [
      { rules: [] }, { rules: [...rules, "Extra"] }, { rules: ["Same", " Same "] }, { rules: ["x".repeat(33)] },
      { rules: [" "] }, { items: [...items, join] }, { items: [join, join] }, { style: "compact" },
      { pending: 3 }, { density: "compact" }, { surface: "outlined" }, { color: "#fff" },
      ...[
        { id: "bad-id" }, { id: "x".repeat(25) }, { author: "x".repeat(25) }, { summary: "x".repeat(121) },
        { detail: "x".repeat(201) }, { reason: "x".repeat(33) }, { submittedAt: "2026-11-21T09:00:00" },
        { submittedAt: "2026-02-29T09:00:00Z" }, { submittedAt: "2026-11-21T09:00:00+28:30" },
        { kind: "report" }, { status: "done" }, { photo: "https://example.org/photo.png" },
        { goto: "Bad ID" }, { linked: true }, { selectedRule: "No advertising" },
      ].map((field) => ({ items: [{ ...join, ...field }] })),
    ]) expect(props.safeParse({ ...input, ...patch }).success, JSON.stringify(patch)).toBe(false);
  });

  it("uses cast and neutral seeds and has a core near miss and variant probe", () => {
    const empty = { things: [], items: [] };
    const cast = (name: string | number) => ({
      things: [{ type: "person", fields: ["name", "about"] }],
      items: [{ id: "person", type: "person", sample: true, name, about: "Lives nearby." }],
    });
    for (const value of [empty, cast("Ivy"), cast(42), cast("x".repeat(80))])
      expect(props.safeParse(fallback({ cast: value })).success).toBe(true);
    expect(fallback({ cast: empty })).toEqual({ items: [], rules: ["Item one"] });
    expect(fallback({ cast: cast("Ivy") })).toMatchObject({ items: [{ author: "Ivy", summary: "Lives nearby." }] });
    expect(meta).toMatchObject({ status: "ready", tier: "people", dense: true, weight: 3, confirmParts: ["decline", "remove"] });
    expect(createRegistry({ packs: ["community"] }).ids.includes(meta.id)).toBe(packReady("community"));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "List" }));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }));
    expect(probes.filter(({ kind }) => kind === "read")).toHaveLength(2);
  });
});

// prettier-ignore
describe("ModQueue states and parts", () => {
  it("filters joins without renumbering or leaking hidden items; brief hides only detail", () => {
    const mixed = { ...input, items: [flagged, join, { ...join, id: "closed_join", status: "approved" }] };
    const full = addressedElements(renderInstance(meta.id, mixed, "filled", theme, { component: "m1" }));
    expect(full.get(at("count"))?.text).toEqual(["2"]);
    expect(full.get(at("count_label"))?.text).toEqual(["pending"]);
    expect(full.has(at("r2/detail"))).toBe(true);
    const filtered = { ...mixed, style: "joins", detail: "brief" };
    const parts = addressedElements(renderInstance(meta.id, filtered, "filled", theme, { component: "m1" }));
    expect(parts.get(at("count"))?.text).toEqual(["1"]);
    expect(parts.get(at("r2/author"))?.text).toEqual(["Ivy Chen"]);
    expect(parts.has(at("r2/photo"))).toBe(true);
    expect(parts.has(at("r2/detail"))).toBe(false);
    expect(parts.has(at("r1/root"))).toBe(false);
    expect(parts.has(at("r3/root"))).toBe(false);
    expect(parts.get(at("r2/reason"))?.attributes).toContain('role="radiogroup"');
    expect(props.parse(filtered).items[1]?.detail).toBe(join.detail);
    const read = readComponent(def, filtered, "m1").join("\n");
    expect(read).toContain("[m1/r2 press");
    expect(read).toContain("[m1/r2/reason select");
    expect(read).not.toMatch(/Lee Ortiz|m1\/r[13]|volunteer on Saturdays/);
  });

  it.each([
    ["empty", "Nothing here yet"], ["loading", 'aria-busy="true"'],
    ["success", "Decision saved."], ["error", "Could not save the decision."],
  ] as const)("renders %s without offering decisions", (state, message) => {
    const html = renderInstance(meta.id, input, state, theme);
    expect(html).toContain(message);
    expect(html).not.toContain('role="button"');
    expect(readComponent(def, input, "m1", state).join("\n")).not.toContain("[m1/");
  });

  it("renders a resolved comment and an empty filtered queue", () => {
    const resolved = examples[2]!;
    const html = renderInstance(meta.id, resolved, "filled", theme);
    expect(html).toContain("Flagged comment");
    expect(html).toContain("Removed");
    expect(html).toContain("Recorded reason: Personal attacks");
    expect(html).not.toContain('role="button"');
    expect(renderInstance(meta.id, { ...resolved, style: "joins" }, "filled", theme)).toContain("Nothing is waiting for review.");
  });
});

it("offers only the linked root and local rule choices without a moderation host", () => {
  const screen = screenOf({ ...input, items: [...input.items] });
  const runtime = createScreenController({ screen, defs });
  const choose = (part: string, value: string) => runtime.act({ address: at(part), action: "select", value });
  try {
    expect(runtime.actionsAt(at("r1"))).toEqual(["press"]);
    expect(runtime.actionsAt(at("r2"))).toEqual([]);
    expect(runtime.read()).not.toMatch(/\/(?:approve|decline|remove) press/);
    expect(choose("r1/reason", "Unknown rule").ok).toBe(false);
    expect(choose("r2/reason", "No advertising").ok).toBe(true);
    expect(choose("r1/reason", "Local residents only").ok).toBe(true);
    expect(runtime.read()).toMatch(/Ivy Chen.*Selected reason: Local residents only/);
    expect(runtime.read()).toMatch(/Lee Ortiz.*Selected reason: No advertising/);
    expect(runtime.snapshotScreen()).toEqual(screen);
    screen.components[0]!.items[0] = { ...join, id: "replacement" };
    expect(runtime.read()).not.toContain("Selected reason: Local residents only");
    expect(runtime.read()).toContain("Selected reason: No advertising");
  } finally {
    runtime.dispose();
  }
});

// prettier-ignore
it.each([approve, decline])("dispatches %s once, revalidating destructive confirmations", async (decision) => {
  const screen = screenOf({ ...input, items: [...input.items, { ...join, id: "closed_join", status: "approved" }] });
  const settled = new Set<string>();
  const run = vi.fn(({ input: { itemId } }: CommandRequest) => {
    if (itemId === join.id) settled.add(String(itemId));
    return { status: itemId === join.id ? "accepted" : "rejected" } as const;
  });
  const runtime = createScreenController({ screen, defs, hostCommands: {
    commands: { moderate_item: { allows: ({ input: { itemId } }) => !settled.has(String(itemId)), run } },
  } });
  const press = (part: string) => runtime.press(at(part));
  try {
    expect(runtime.read()).toContain("[m1/r1/approve press !needs-people]");
    expect(runtime.actionsAt(at("r1/remove"))).toEqual([]);
    expect(runtime.actionsAt(at("r2/decline"))).toEqual([]);
    expect(runtime.actionsAt(at("r3/approve"))).toEqual([]);
    expect(press(decline).ok).toBe(true);
    expect(run).not.toHaveBeenCalled();
    expect(runtime.press("home/confirm/cancel").ok).toBe(true);
    expect(press(remove).ok).toBe(true);
    screen.components[0]!.items[1] = { ...flagged, id: "replacement" };
    expect(runtime.press("home/confirm/confirm").ok).toBe(false);
    expect(run).not.toHaveBeenCalled();
    expect(runtime.press("home/confirm/cancel").ok).toBe(true);
    expect(press(decision).ok).toBe(true);
    if (decision === decline) {
      expect(run).not.toHaveBeenCalled();
      expect(runtime.press("home/confirm/confirm").ok).toBe(true);
    }
    expect(press(decision).ok).toBe(false);
    await vi.waitFor(() => expect(runtime.read()).toContain("moderate_item accepted"));
    expect(runtime.actionsAt(at(decline))).toEqual([]);
    expect(runtime.act({ address: at("r2/reason"), action: "select", value: "No advertising" }).ok).toBe(true);
    expect(press(remove).ok).toBe(true);
    expect(run).toHaveBeenCalledTimes(1);
    expect(runtime.press("home/confirm/confirm").ok).toBe(true);
    expect(run).toHaveBeenNthCalledWith(1, expect.objectContaining({
      input: { itemId: join.id, decision: decision === approve ? "approved" : "declined", reason: null },
    }), expect.anything());
    expect(run).toHaveBeenNthCalledWith(2, expect.objectContaining({
      input: { itemId: "replacement", decision: "removed", reason: "No advertising" },
    }), expect.objectContaining({ source: "human" }));
    await vi.waitFor(() => expect(runtime.read()).toContain("moderate_item rejected"));
    expect(runtime.actionsAt(at(remove))).toEqual(["press"]);
  } finally {
    runtime.dispose();
  }
});
