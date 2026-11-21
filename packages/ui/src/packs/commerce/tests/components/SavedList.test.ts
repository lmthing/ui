import { describe, expect, it, onTestFinished, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  readComponent,
  stampItemIds,
  type CastLike,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.SavedList;
const { props, meta, examples, fallback, probes } = def;
const rows = examples[0]!;
const grid = examples[1]!;
const entry = rows.items[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const address = (part: string) => `home/c1/${part}`;
const render = (input: unknown, state: (typeof meta.states)[number] = "filled") =>
  renderInstance("SavedList", input, state, theme);

describe("SavedList schema and boundaries", () => {
  it.each(examples)("accepts a domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("accepts the exact list limit and preserves saved product ids separately from view addresses", () => {
    const items = Array.from({ length: 12 }, (_, i) => ({
      id: `${i}`.padEnd(24, "a"),
      name: "x".repeat(28),
      price: 99999.99,
    }));
    const parsed = stampItemIds(meta, props.parse({ items })).items;
    expect(parsed).toHaveLength(12);
    expect(parsed[0]).toMatchObject({ ...items[0], id: "r1", claimed: false, productRef: items[0]!.id });
    expect(props.safeParse({ items: [...items, { ...items[0], id: "thirteen" }] }).success).toBe(false);
  });
  it.each([
    { items: [] },
    { items: [entry, entry] },
    { arrange: "sideways" },
    { style: "grid" },
    { color: "red" },
    ...[
      { id: "x".repeat(25) },
      { name: "x".repeat(29) },
      { price: -1 },
      { price: 1.005 },
      { savedPrice: Infinity },
      { targetPrice: 100000 },
      { stock: -1 },
      { stock: 1.5 },
      { claimed: "yes" },
      { goto: "Not valid" },
      { photo: "https://example.org/image" },
      { badge: "Sale" },
    ].map((change) => ({ items: [{ ...entry, ...change }] })),
  ])("rejects invalid input %j", (change) =>
    expect(props.safeParse({ ...rows, ...change }).success).toBe(false),
  );
});

describe("SavedList fallback and metadata", () => {
  it("uses cast titles or shared neutral placeholders", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "sample", fields: ["name"] }],
        items: [{ id: "one", type: "sample", sample: true, name: "Stone planter" }],
      },
      { things: [], items: [{ id: "one", type: "sample", sample: true, name: 1 }] },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(casts.map((cast) => fallback({ cast }).items[0]?.name)).toEqual([
      "Item one",
      "Stone planter",
      "Item one",
    ]);
  });
  it("declares the dense phone contract, confirmation, claim tier, and probes", () => {
    expect(meta).toMatchObject({
      dense: true,
      weight: 3,
      tier: "phone",
      confirmParts: ["remove"],
      partTiers: { claim: "people" },
    });
    expect(probes.filter(({ kind }) => kind === "choose").map(({ expect }) => expect)).toEqual([
      "SavedList",
      "List",
    ]);
    expect(probes).toContainEqual(
      expect.objectContaining({
        kind: "write",
        variant: expect.objectContaining({ axis: "arrange", value: "grid" }),
      }),
    );
    expect(probes.filter(({ kind }) => kind === "read")).toHaveLength(5);
    expect(createRegistry({ packs: ["commerce"] }).ids.includes("SavedList")).toBe(packReady("commerce"));
  });
});

describe("SavedList states and parts", () => {
  it("draws product links separately from local controls and keeps them across grid and rows", () => {
    const list = addressedElements(render(rows));
    const tiles = addressedElements(render({ ...rows, arrange: "grid" }));
    expect([...tiles.keys()].sort()).toEqual([...list.keys()].sort());
    expect(list.get(address("r1/root"))?.attributes).toContain('role="link"');
    expect(list.get(address("r1/alert"))?.attributes).toContain('role="spinbutton"');
    expect(list.get(address("r1/saved_price"))?.text).toEqual(["Was $16"]);
    expect(list.get(address("r1/badge"))?.text).toEqual(["$4 less"]);
    expect(list.get(address("r2/badge"))?.text).toEqual(["Only 2 left"]);
    expect(list.has(address("r2/saved_price"))).toBe(false);
    expect(list.has(address("r1/claim"))).toBe(false);
    expect(list.get(address("r2/root"))?.attributes).not.toContain('role="link"');
  });
  it("shows shared claims, unavailable move and optional photos correctly", () => {
    const list = addressedElements(
      render({ ...grid, items: [grid.items[0], { ...grid.items[1], photo: undefined }] }),
    );
    expect(list.get(address("r1/claim"))?.attributes).toContain('aria-checked="true"');
    expect(list.get(address("r2/claim"))?.attributes).toContain('aria-checked="false"');
    expect(list.get(address("r2/move"))?.attributes).toContain('aria-disabled="true"');
    expect(list.get(address("r2/badge"))?.text).toEqual(["Sold out"]);
    expect(list.get(address("r2/photo"))?.attributes).toContain('aria-label="Treat pouch"');
  });
  it.each(["empty", "loading", "error", "success"] as const)(
    "draws %s without offering hidden actions",
    (state) => {
      const html = render(rows, state),
        parts = addressedElements(html);
      expect(parts.has(address("root"))).toBe(true);
      expect(parts.has(address("empty"))).toBe(state === "empty");
      expect(parts.has(address("status"))).toBe(state === "success" || state === "error");
      expect(parts.get(address("r1/alert"))?.attributes.includes('role="spinbutton"') ?? false).toBe(
        state === "success",
      );
      const reading = readComponent(def, rows, "s1", state).join("\n");
      expect(reading.includes("[s1/r1/alert set")).toBe(state === "success");
    },
  );
});

// prettier-ignore
function runtimeFor(input: unknown) {
  const screen = { id: "home", components: [{ ...(input as object), c: "SavedList", id: "c1" }] };
  const onAction = vi.fn(), onLink = vi.fn();
  const runtime = createScreenController({ screen, defs: components, onAction, onLink, requireMounted: false });
  onTestFinished(() => runtime.dispose());
  const press = (part: string) => runtime.press(address(part)).ok;
  const set = (part: string, value: unknown) => runtime.act({ address: address(part), action: "set", value }).ok;
  return { runtime, press, set, onAction, onLink };
}

describe("SavedList read and act", () => {
  it("opens only linked items and moves an available item once, without navigating", () => {
    const { runtime, press, onLink, onAction } = runtimeFor(rows);
    expect(press("r2/root")).toBe(false);
    expect(press("r1/root")).toBe(true);
    expect(onLink).toHaveBeenCalledOnce();
    expect(press("r1/move")).toBe(true);
    expect(press("r1/move")).toBe(false);
    expect(onAction).toHaveBeenCalledWith({ address: "home/c1/r1/move", action: "press" });
    expect(onLink).toHaveBeenCalledOnce();
    expect(runtime.read()).toContain("Saved list updated");
    expect(runtime.read()).not.toContain("Glazed fern pot");
    expect(runtime.read()).toContain("[c1/r2/move press");
  });

  it("keeps a claim on its own addressed item and rejects sold-out and unshared controls", () => {
    const gift = runtimeFor(grid),
      personal = runtimeFor(rows);
    expect(gift.press("r2/move")).toBe(false);
    expect(personal.press("r1/claim")).toBe(false);
    expect(gift.press("r2/claim")).toBe(true);
    expect(gift.runtime.read()).toContain("[c1/r2/claim toggle:on !needs-people]");
    expect(gift.press("r2/claim")).toBe(true);
    expect(gift.runtime.read()).toContain("[c1/r2/claim toggle:off !needs-people]");
  });

  it("confirms only removal, preserves IDs, and edits the surviving row even after a cancellation", () => {
    const { runtime, press, set } = runtimeFor(rows);
    expect(press("r1/remove")).toBe(true);
    expect(runtime.confirmation).toBeDefined();
    expect(runtime.press("home/confirm/cancel").ok).toBe(true);
    expect(runtime.read()).toContain("Glazed fern pot");
    expect(press("r1/remove")).toBe(true);
    expect(runtime.press("home/confirm/confirm").ok).toBe(true);
    expect(runtime.read()).not.toContain("Glazed fern pot");
    expect(set("r1/alert", 9)).toBe(false);
    for (const value of [-1, 1.005, 100000, "12"]) expect(set("r2/alert", value), String(value)).toBe(false);
    expect(set("r2/alert", 9.55)).toBe(true);
    expect(runtime.read()).toContain("Target price · $9.55");
    expect(press("r2/remove")).toBe(true);
    expect(runtime.press("home/confirm/confirm").ok).toBe(true);
    expect(runtime.read()).not.toContain("Basil planter");
    expect(runtime.read()).not.toContain("press]");
  });
});
