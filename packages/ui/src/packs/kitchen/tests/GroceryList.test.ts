import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createAgentAccess, createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance, styleAt } from "../../../../test/render";
const { props, meta, examples, fallback, probes } = components.GroceryList;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const item = { name: "Tomatoes", qty: "600 g", got: false, by: "Sam" };
const input = { aisles: [{ label: "Produce", items: [item, { name: "Basil", got: true }] }] };
const valueOf = (value: unknown) =>
  stampItemIds(meta, props.parse(value)) as {
    aisles: { label: string; items: (typeof item)[] }[];
    rows: (typeof item & { id: string; aisleIndex: number })[];
  };
const render = (value: unknown = input, state: "filled" | "empty" | "success" = "filled") =>
  renderInstance("GroceryList", value, state, theme, { component: "g1", thing: "grocery item" });

describe("GroceryList schema and boundaries", () => {
  it.each(examples)("accepts each domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims text, defaults checks and derives stable flat rows without sorting wire data", () => {
    const parsed = valueOf({ aisles: [{ label: " Produce ", items: [{ name: " Tomatoes " }] }] });
    expect(parsed.rows[0]).toEqual({ id: "r1", name: "Tomatoes", got: false, aisleIndex: 0 });
    expect(parsed.aisles[0]!.label).toBe("Produce");
    expect(valueOf(input).rows.map((row) => row.got)).toEqual([false, true]);
    type View = Props<typeof props, typeof meta>;
    expectTypeOf<View>().not.toBeAny();
    expectTypeOf<View>().not.toHaveProperty("color");
  });
  it.each([
    {},
    { aisles: [] },
    { aisles: Array(9).fill(input.aisles[0]) },
    { aisles: [{ label: "Produce", items: [] }] },
    { aisles: [{ label: "Produce", items: Array(13).fill(item) }] },
    ...["", " ", "a".repeat(17)].map((label) => ({ aisles: [{ label, items: [item] }] })),
    ...Object.entries({
      name: ["", " ", "a".repeat(29)],
      qty: ["", "a".repeat(13)],
      by: ["", "a".repeat(13)],
      got: ["yes"],
      id: ["r1"],
      aisleIndex: [0],
      color: ["#ffffff"],
      pixels: [44],
    }).flatMap(([key, values]) =>
      values.map((value) => ({ aisles: [{ label: "Produce", items: [{ ...item, [key]: value }] }] })),
    ),
    { ...input, rows: [] },
    { ...input, color: "red" },
    { ...input, style: "cards" },
    { aisles: [{ ...input.aisles[0], unknown: true }] },
  ])("rejects invalid, validator-owned and presentation input", (value) =>
    expect(props.safeParse(value).success).toBe(false),
  );
  it("accepts and renders all 96 items at the exact maximum text lengths", () => {
    const row = { name: "a".repeat(28), qty: "a".repeat(12), by: "a".repeat(12), got: false };
    const aisle = { label: "a".repeat(16), items: Array(12).fill(row) };
    const maximum = { aisles: Array(8).fill(aisle) };
    const parsed = valueOf(maximum);
    expect(parsed.rows).toHaveLength(96);
    const html = render(maximum);
    const addresses = new Set(html.match(/home\/g1\/r\d+\/\w+/g));
    for (const row of parsed.rows)
      for (const part of meta.items.parts) expect(addresses.has(`home/g1/${row.id}/${part}`)).toBe(true);
    expect(affordancesOf(meta, parsed, "g1")).toHaveLength(97);
  });
});
describe("GroceryList fallback and contract", () => {
  const casts: CastLike[] = [
    { things: [], items: [] },
    {
      things: [{ type: "plant", fields: ["name"] }],
      items: [{ id: "fern", type: "plant", sample: true, name: "Fern" }],
    },
    { things: [], items: [{ id: "bad", type: "record", sample: true, name: 4 }] },
    {
      things: [{ type: "plant", fields: ["name"] }],
      items: Array.from({ length: 8 }, (_, index) => ({
        id: `p${index}`,
        type: "plant",
        sample: true,
        name: "x".repeat(80),
      })),
    },
  ];
  it.each(casts)("validates empty, useful, malformed and overlong casts", (cast) =>
    expect(props.safeParse(fallback({ cast })).success).toBe(true),
  );
  it("uses cast names or shared neutral placeholders", () => {
    expect(fallback({ cast: casts[0]! }).aisles[0]!.items).toEqual([{ name: "Item one", got: false }]);
    expect(fallback({ cast: casts[1]! }).aisles[0]!.items[0]!.name).toBe("Fern");
    expect(fallback({ cast: casts[2]! }).aisles[0]!.items[0]!.name).toBe("Item one");
    expect(fallback({ cast: casts[3]! }).aisles[0]!.items).toHaveLength(3);
    expect(fallback({ cast: casts[3]! }).aisles[0]!.items[0]!.name).toHaveLength(28);
  });
  it("preserves the core-first near miss, density, tier, states and signature", () => {
    expect(meta).toMatchObject({ status: "ready", weight: 3, dense: true, tier: "phone" });
    expect(meta.partTiers).toEqual({ by: "people" });
    expect(meta.states).toEqual(["filled", "empty", "success"]);
    expect(meta.signature).toBe("check_burst");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.realPath).not.toBe("");
    expect(meta.pick).toContain("Checklist");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Checklist" }));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "write", expect: "GroceryList" }));
    expect(probes.filter((probe) => probe.kind === "read").map((probe) => probe.expect)).toEqual([
      { address: "g1/r1/got", action: "check" },
      { address: "g1/add", action: "type" },
    ]);
    const registry = createRegistry({ packs: ["kitchen"], includeDrafts: true });
    expect(registry.resolve("grocery-list")).toBe("GroceryList");
  });
});
describe("GroceryList states, parts, reading and actions", () => {
  it("draws only present optional parts and exposes check and type roles", () => {
    const html = render();
    expect(elementAt(html, "home/g1/root").attributes).toContain('role="list"');
    expect(elementAt(html, "home/g1/r1/got").attributes).toContain('role="checkbox"');
    expect(elementAt(html, "home/g1/add").attributes).toContain('role="textbox"');
    for (const part of ["qty", "by"]) {
      expect(() => elementAt(html, `home/g1/r1/${part}`)).not.toThrow();
      expect(() => elementAt(html, `home/g1/r2/${part}`)).toThrow();
    }
    const read = readComponent(components.GroceryList, input, "g1").join("\n");
    for (const text of "Produce|Tomatoes|600 g|Sam|Basil|!needs-people".split("|"))
      expect(read).toContain(text);
    for (const action of affordancesOf(meta, valueOf(input), "g1"))
      expect(read).toContain(`[${action.address} ${action.action}${action.detail}]`);
  });
  it("moves bought rows to the bottom of their aisle without changing item addresses", () => {
    const items = [
      { ...item, got: true },
      { name: "Basil", got: false },
    ];
    const value = {
      aisles: [
        { label: "Produce", items },
        { label: "Dairy", items: [{ name: "Milk" }] },
      ],
    };
    const html = render(value);
    const at = (id: number) => html.indexOf(`data-testid="home/g1/r${id}/root"`);
    expect(at(2)).toBeLessThan(at(1));
    expect(at(1)).toBeLessThan(at(3));
    expect(styleAt(html, "home/g1/r1/name")).toContain("line-through");
    expect(valueOf(value).rows.map((row) => row.name)).toEqual(["Tomatoes", "Basil", "Milk"]);
  });
});
describe("GroceryList states and runtime", () => {
  it.each(["empty", "success"] as const)("draws intentional %s copy and keeps the add field", (state) => {
    const html = render(input, state);
    expect(html).toContain(state === "empty" ? "No grocery items yet" : "Everything is in the bag");
    expect(html).not.toContain("Tomatoes");
    expect(html).not.toContain('role="checkbox"');
    expect(() => elementAt(html, "home/g1/summary")).not.toThrow();
    expect(() => elementAt(html, "home/g1/add")).not.toThrow();
    expect(meta.read(props.parse(input), state)).toEqual([]);
  });
  it("shows computed completion while retaining all checked rows for undo", () => {
    const value = { aisles: [{ label: "Produce", items: [{ ...item, got: true }] }] };
    expect(render(value)).toContain("Everything is in the bag");
    const read = readComponent(components.GroceryList, value, "g1").join("\n");
    expect(read).toContain("Everything is in the bag");
    expect(elementAt(render(value), "home/g1/r1/got").attributes).toContain('aria-checked="true"');
  });
  it("checks, unchecks and types through the real runtime and rejects invalid or atomic failed batches", () => {
    const screen = { id: "home", components: [{ id: "g1", c: "GroceryList", ...input }] };
    const runtime = createScreenController({ screen, defs: components });
    const options = { current: () => screen, defs: components };
    const agent = createAgentAccess({ ...options, store: runtime.store, runtime });
    const step = { address: "g1/r1/got", action: "check" };
    expect(agent.act(step).ok).toBe(true);
    expect(runtime.store.get("home/g1/r1/got")).toBe(true);
    expect(agent.read()).toContain("g1/r1/got check:done");
    expect(agent.act(step).ok).toBe(true);
    expect(runtime.store.get("home/g1/r1/got")).toBe(false);
    expect(agent.act({ address: "g1/r2/got", action: "check" }).ok).toBe(true);
    expect(runtime.store.get("home/g1/r2/got")).toBe(false);
    expect(agent.act({ ...step, value: true }).ok).toBe(true);
    expect(agent.act({ address: "g1/add", action: "type", value: "Bread" }).ok).toBe(true);
    expect(runtime.store.get("home/g1/add")).toBe("Bread");
    const before = runtime.store.snapshot();
    expect(agent.act([step, { address: "g1/r1/name", action: "check" }]).ok).toBe(false);
    expect(runtime.store.snapshot()).toEqual(before);
    expect(agent.act({ ...step, value: "yes" }).ok).toBe(false);
    expect(agent.act({ address: "g1/add", action: "type", value: 4 }).ok).toBe(false);
    runtime.dispose();
  });
});
