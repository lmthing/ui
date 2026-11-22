import { expect, it } from "vitest";
import { components, createRegistry, packReady, readComponent, readScreen } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { MomentumChart } from "../../components";

const { examples, fallback, probes, props } = MomentumChart;
const seed = examples[0]!;

it.each(examples)("accepts a domain example", (example) => {
  expect(props.safeParse(example).success).toBe(true);
});

it("accepts the point limit and both endpoints of each mode's scale", () => {
  const points = Array.from({ length: 60 }, (_, index) => ({
    id: String(index),
    clock: `${index}′`,
    value: index % 2 ? 0 : 100,
  }));
  expect(props.safeParse({ ...seed, points }).success).toBe(true);
  expect(
    props.safeParse({
      ...seed,
      mode: "momentum",
      points: points.map((point) => ({ ...point, value: point.value || -100 })),
    }).success,
  ).toBe(true);
});

it.each<Record<string, unknown>>([
  { points: seed.points.slice(1) },
  { points: Array.from({ length: 61 }, (_, i) => ({ id: `${i}`, clock: `${i}′`, value: 50 })) },
  { points: seed.points.map((point) => ({ ...point, id: "duplicate" })) },
  { points: seed.points.map((point) => ({ ...point, id: "m".repeat(13) })) },
  { points: seed.points.map((point) => ({ ...point, clock: "m".repeat(13) })) },
  { points: seed.points.map((point) => ({ ...point, event: "m".repeat(41) })) },
  { points: seed.points.map((point) => ({ ...point, value: -1 })) },
  { mode: "momentum", points: seed.points.map((point) => ({ ...point, value: -101 })) },
  { points: seed.points.map((point) => ({ ...point, value: 101 })) },
  { home: "m".repeat(21) },
  { away: "m".repeat(21) },
  { mode: "odds" },
  { detail: "compact" },
  { color: "red" },
])("rejects invalid chart input", (extra) => {
  expect(props.safeParse({ ...seed, ...extra }).success).toBe(false);
});

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

it("draws only the full variant's event controls, without changing the plot address", () => {
  const render = (input: object, state: "filled" | "loading" | "empty") =>
    renderInstance("MomentumChart", input, state, theme);
  const filled = render(seed, "filled");
  const addresses = addressedElements(filled);
  for (const id of ["root", "plot", "event", "r3/root", "r4/root", "r6/root"])
    expect(addresses.has(`home/c1/${id}`)).toBe(true);
  expect(addresses.get("home/c1/r4/root")?.attributes).toContain('role="button"');
  expect(addresses.has("home/c1/r2/root")).toBe(false);
  expect(filled).toContain("Reed scores for Ledge");
  expect(filled).toContain("Ledge Lions +32 pp");

  const brief = render({ ...seed, detail: "brief" }, "filled");
  expect(addressedElements(brief).has("home/c1/plot")).toBe(true);
  expect(addressedElements(brief).has("home/c1/r4/root")).toBe(false);
  expect(brief).not.toContain("Reed scores for Ledge");
  expect(brief).toContain("18% to 82% · 50% = even");
  expect(render(seed, "empty")).toContain("The match momentum feed is unavailable.");
  const loading = render(seed, "loading");
  expect(loading).toContain('aria-busy="true"');
  expect(addressedElements(loading).has("home/c1/r4/root")).toBe(false);
});

it("reads and selects event markers without changing the chart, and rejects hidden or invalid points", () => {
  const screen = {
    id: "home",
    components: [
      { id: "c1", c: "MomentumChart", ...seed },
      { id: "c2", c: "MomentumChart", ...seed, detail: "brief" },
      { id: "c3", c: "MomentumChart", ...seed, state: "loading" as const },
    ],
  };
  const controller = createScreenController({ screen, defs: components });
  const select = (address: string, value?: string) =>
    controller.act({ address, action: "select", ...(value ? { value } : {}) });
  const reading = () => readScreen(screen, components, controller.store.snapshot());
  try {
    expect(reading()).toContain("Selected event: r6");
    for (const address of ["c1/r2", "c1/r7", "c2/r4", "c3/r4"]) expect(select(address).ok).toBe(false);
    expect(select("c1/r4", "lead").ok).toBe(false);
    expect(select("c1/r4", "level").ok).toBe(true);
    expect(reading()).toContain("Selected event: r4");
    expect(reading()).toContain("r4: 42′ · 46% · Fern House equalizes");
    expect(select("c1/r3").ok).toBe(true);
    expect(reading()).toContain("Selected event: r3");
    expect(reading()).toContain("84′ · 82% · Ledge Lions +32 pp");
    expect(controller.store.get("home/c1/r4")).toBe(false);
    expect(controller.store.get("home/c1/r3")).toBe(true);
    expect(seed.points[3]?.value).toBe(46);
  } finally {
    controller.dispose();
  }
});

it("uses cast names or neutral placeholders and an even series", () => {
  const empty = fallback({ cast: { things: [], items: [] } });
  expect(props.parse(empty).points.every(({ value }) => value === 50)).toBe(true);
  expect([empty.home, empty.away]).toEqual(["Item one", "Item two"]);
  const things = [{ type: "team", fields: ["name"] }];
  const item = { id: "fern", type: "team", sample: true };
  for (const name of ["Fern House", 3]) {
    const input = fallback({ cast: { things, items: [{ ...item, name }] } });
    expect(props.safeParse(input).success).toBe(true);
    expect(input.home).toBe(typeof name === "string" ? name : "Item one");
  }
});

it("addresses only points with events and retains original addresses when skipping points", () => {
  const read = readComponent(MomentumChart, seed, "c1").join("\n");
  expect(read).toContain("r4: 42′ · 46% · Fern House equalizes");
  expect(read).toContain("[c1/r4 select");
  expect(read).not.toContain("[c1/r2 select");
  const compact = readComponent(MomentumChart, { ...seed, detail: "brief" }, "c1").join("\n");
  expect(compact).not.toContain("equalizes");
  expect(compact).not.toContain(" select");
  expect(probes[1]).toMatchObject({ kind: "choose", expect: "Sparkline" });
});

it("follows pack readiness in live registries", () => {
  expect(createRegistry({ packs: ["sports"] }).ids.includes("MomentumChart")).toBe(packReady("sports"));
});
