import { describe, expect, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  planAct,
  readComponent,
  wordsFor,
  type DeviceData,
  type StateName,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.PlaceCard;
const { props, meta, fallback, probes, examples } = def;
const [nursery, cafe, hidden] = examples.map((input) => props.parse(input));
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const record = { name: nursery!.name, goto: nursery!.goto, localTime: "17:30", distanceKm: 1.2 };

function render(input: unknown, state: StateName = "filled", deviceData: DeviceData = {}) {
  return renderInstance("PlaceCard", input, state, theme, {
    component: "p1",
    deviceData,
    resolvePhoto: (reference) => (reference === nursery!.photo ? "/nursery.jpg" : undefined),
  });
}
const draw = (...args: Parameters<typeof render>) => addressedElements(render(...args));

describe("PlaceCard contract and boundaries", () => {
  it.each(examples)("accepts a real venue", (input) => {
    expect(props.safeParse(input).success).toBe(true);
  });

  it("accepts the bounds and trims text", () => {
    const name = "a".repeat(32);
    const category = "b".repeat(20);
    expect(
      props.parse({ name: ` ${name} `, category, goto: "a".repeat(64), rating: 0, priceLevel: 1 }),
    ).toMatchObject({ name, category, rating: 0, priceLevel: 1, media: "cover" });
    expect(
      props.safeParse({
        name,
        category,
        goto: "details",
        rating: 5,
        priceLevel: 4,
        opens: "00:00",
        closes: "23:59",
      }).success,
    ).toBe(true);
  });

  it.each([
    { name: " " },
    { name: "a".repeat(33) },
    { category: "" },
    { category: "a".repeat(21) },
    { goto: undefined },
    { goto: "Wrong Case" },
    { photo: "https://example.org/photo" },
    { rating: -0.1 },
    { rating: 5.1 },
    { priceLevel: 0 },
    { priceLevel: 2.5 },
    { priceLevel: 5 },
    { opens: "09:00", closes: undefined },
    { opens: undefined, closes: "18:00" },
    { opens: "9:00" },
    { closes: "24:00" },
    { media: "thumb" },
    { density: "tight" },
    { distance: 3 },
    { open: true },
    { color: "#fff" },
  ])("rejects invalid changes: %j", (invalid) => {
    expect(props.safeParse({ ...nursery, ...invalid }).success).toBe(false);
  });
});

describe("PlaceCard metadata", () => {
  it("keeps a ready entry behind the pack readiness gate and preserves all probes", () => {
    expect(meta.status).toBe("ready");
    expect(meta.tier).toBe("ok");
    expect(meta.realPath).not.toBe("");
    expect(createRegistry({ packs: ["places"] }).ids.includes("PlaceCard")).toBe(packReady("places"));
    expect(probes).toEqual([
      expect.objectContaining({ kind: "choose", expect: "PlaceCard" }),
      expect.objectContaining({ kind: "choose", expect: "Card" }),
      expect.objectContaining({ kind: "write", expect: "PlaceCard" }),
      expect.objectContaining({ kind: "write", variant: { axis: "media", value: "none" } }),
      expect.objectContaining({ kind: "read", expect: { address: "p1", action: "press" } }),
      ...[{ badge: "Member deal" }, { saved: false }, { unit: "mi" }].map((expectProps) =>
        expect.objectContaining({ kind: "write", expectProps }),
      ),
      expect.objectContaining({ kind: "read", expect: { address: "p1/save", action: "toggle" } }),
      expect.objectContaining({ kind: "read", expect: { address: "p1/unit", action: "select" } }),
    ]);
  });
});

describe("PlaceCard fallback", () => {
  it("validates localized neutral placeholders and uses a matching cast without inventing data", () => {
    const empty = { things: [], items: [] };
    const matching = {
      things: [{ type: "venue", fields: ["name", "note"] }],
      items: [{ id: "venue", type: "venue", sample: true, name: "Riverside", note: "North entrance" }],
    };
    const malformed = { ...matching, items: [{ ...matching.items[0]!, name: 7, note: false }] };
    const neutral = {
      name: placeholderTitle(0, "en"),
      category: wordsFor("en").placeholderDetail,
      goto: "details",
    };
    for (const cast of [empty, matching, malformed])
      expect(props.safeParse(fallback({ cast, lang: "en" })).success).toBe(true);
    expect(fallback({ cast: empty, lang: "en" })).toEqual(neutral);
    expect(fallback({ cast: malformed, lang: "en" })).toEqual(neutral);
    expect(fallback({ cast: matching })).toEqual({
      ...neutral,
      name: "Riverside",
      category: "North entrance",
    });
  });
});

describe("PlaceCard states and parts", () => {
  it("draws all supplied and computed parts and exposes only the root link", () => {
    const html = render(nursery, "filled", { place_details: [record] });
    const parts = addressedElements(html);
    expect([...parts.keys()].sort()).toEqual(
      meta.parts
        .filter((part) => !["badge", "save", "unit"].includes(part))
        .map((part) => `home/p1/${part}`)
        .sort(),
    );
    expect(parts.get("home/p1/root")?.attributes).toContain('role="link"');
    expect(parts.get("home/p1/root")?.attributes).toContain('aria-label="Riverside Nursery"');
    expect(html).toContain("Closes 18:00");
  });

  it("hides only the photo for media none and omits absent optional parts", () => {
    expect(draw({ ...nursery, media: "none" }).has("home/p1/photo")).toBe(false);
    expect(draw(hidden).has("home/p1/name")).toBe(true);
    expect([...draw({ ...cafe, rating: undefined }).keys()]).toEqual([
      "home/p1/root",
      "home/p1/name",
      "home/p1/category",
    ]);
    expect(draw({ ...cafe, photo: "local:1" }).has("home/p1/photo")).toBe(false);
    expect(draw({ ...cafe, rating: 0 }).get("home/p1/rating")?.text).toEqual(["0"]);
  });

  it("retains every filled part when moving the cover to the compact thumbnail", () => {
    const data = { place_details: [record] };
    const compact = { ...nursery };
    const parts = draw(compact, "filled", data);
    expect([...parts.keys()].sort()).toEqual([...draw(nursery, "filled", data).keys()].sort());
    expect(parts.get("home/p1/photo")?.attributes).toContain('aria-label="Riverside Nursery"');
    expect([...draw(compact, "loading", data).keys()]).toEqual(["home/p1/root"]);
  });

  it("shows a busy skeleton without exposing any filled parts or link during loading", () => {
    const html = render(nursery, "loading", { place_details: [record] });
    const parts = addressedElements(html);
    expect([...parts.keys()]).toEqual(["home/p1/root"]);
    expect(parts.get("home/p1/root")?.attributes).not.toContain('role="link"');
    expect(html).toContain('aria-busy="true"');
  });
});

describe("PlaceCard read and act", () => {
  it("reads the same localized venue data and reports permission-requiring navigation", () => {
    const typed = props.parse(nursery);
    const data = { place_details: [record] };
    const reading = readComponent(def, nursery, "p1", "filled", {}, "de", data).join("\n");
    for (const line of ["Rating 4,7 out of 5", "Price level 2 out of 4", "1,2 km away", "Closes 18:00"])
      expect(reading).toContain(line);
    expect(reading).toContain("[p1 press→nursery !needs-ok]");
    expect(affordancesOf(meta, typed, "p1", {}, "loading")).toEqual([]);
    expect(readComponent(def, nursery, "p1", "loading", {}, "en", data)).toEqual(["p1 PlaceCard (loading)"]);
  });

  it("dispatches only root press and never navigates in loading", () => {
    const act = { address: "p1", action: "press" } as const;
    const defs = { PlaceCard: def };
    const screen = (state: StateName) => ({
      id: "home",
      components: [{ ...nursery, c: "PlaceCard", id: "p1", state }],
    });
    expect(planAct(screen("filled"), defs, {}, [act])).toMatchObject({
      ok: true,
      links: [{ address: "home/p1", goto: "nursery" }],
    });
    expect(planAct(screen("filled"), defs, {}, [{ ...act, address: "p1/rating" }])).toMatchObject({
      ok: false,
    });
    expect(planAct(screen("loading"), defs, {}, [act])).toMatchObject({ ok: false });
  });
});
