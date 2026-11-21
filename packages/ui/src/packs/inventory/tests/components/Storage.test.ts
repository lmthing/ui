import { describe, expect, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  stampItemIds,
  type CastLike,
  type DeviceData,
  type StateName,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.Storage;
const { examples, fallback, meta, props, probes } = def;
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const empty = { path: [], spots: [], here: [] };
const spot = { name: "Drawer", icon: "square", goto: "drawer" };
const full = { path: ["Workshop", "Back shelf"], spots: [spot], here: ["Screws"] };
const data: DeviceData = { storage_spots: [{ goto: "drawer", here: ["Hammer"] }] };
const render = (input: unknown, state: StateName = "filled", deviceData = data) =>
  addressedElements(renderInstance("Storage", input, state, theme, { component: "s1", deviceData }));
const root = "home/s1";

describe("Storage schema", () => {
  it.each(examples)("accepts a domain example", (input) => expect(props.safeParse(input).success).toBe(true));

  it("accepts empty groups and exact schema maxima, and applies shared defaults", () => {
    expect(props.parse(empty)).toMatchObject({ surface: "card", detail: "full" });
    expect(props.parse({ ...full, path: [" Workshop "] }).path).toEqual(["Workshop"]);
    expect(
      props.safeParse({
        path: Array(4).fill("p".repeat(16)),
        spots: Array(6).fill({ ...spot, name: "s".repeat(24), goto: "g".repeat(64) }),
        here: Array(6).fill("h".repeat(28)),
      }).success,
    ).toBe(true);
  });

  it.each([
    {},
    { ...empty, path: Array(5).fill("Room") },
    { ...empty, spots: Array(7).fill(spot) },
    { ...empty, here: Array(7).fill("Spare") },
    { ...empty, path: ["p".repeat(17)] },
    { ...empty, spots: [{ ...spot, name: "s".repeat(25) }] },
    { ...empty, here: ["h".repeat(29)] },
    { ...empty, here: [" "] },
    { ...empty, spots: [{ ...spot, icon: "unknown" }] },
    { ...empty, spots: [{ ...spot, goto: "Bad ID" }] },
    { ...empty, spots: [{ ...spot, count: 3 }] },
    { ...empty, spots: [{ ...spot, id: "r1" }] },
    { ...empty, navigation: [] },
    { ...empty, color: "red" },
    { ...empty, detail: "hidden" },
  ])("rejects invalid wire input: %j", (input) => expect(props.safeParse(input).success).toBe(false));
});

describe("Storage fallback and probes", () => {
  it("keeps cast-derived contents bounded and uses neutral placeholders with nothing usable", () => {
    const thing = { type: "tool", fields: ["name"] };
    const item = { type: "tool", id: "drill", sample: true, name: "Drill" };
    const casts: CastLike[] = [
      { things: [], items: [] },
      { things: [thing], items: [item] },
      { things: [thing], items: [{ ...item, name: 5 }] },
      { things: [thing], items: Array(10).fill({ ...item, name: "x".repeat(40) }) },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast, lang: "en" })).success).toBe(true);
    expect(fallback({ cast: casts[0]!, lang: "en" })).toEqual({
      ...empty,
      here: [placeholderTitle(0, "en")],
    });
    expect(fallback({ cast: casts[1]! })).toEqual({ ...empty, here: ["Drill"] });
    expect(fallback({ cast: casts[3]! }).here).toEqual(Array(6).fill("x".repeat(28)));
  });

  it("retains the dense phone contract, near miss and pack gate", () => {
    expect(meta).toMatchObject({ weight: 3, dense: true, tier: "phone" });
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta).not.toHaveProperty("confirmParts");
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Storage" }),
        expect.objectContaining({ kind: "choose", expect: "List" }),
        expect.objectContaining({ kind: "write", expect: "Storage" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: { address: "s1/r3", action: "press" } }),
      ]),
    );
    expect(createRegistry({ packs: ["inventory"] }).ids.includes("Storage")).toBe(packReady("inventory"));
  });
});

describe("Storage states and parts", () => {
  it("draws ancestor and spot addresses in order, with count as optional detail", () => {
    const parts = render(full);
    expect([...parts.keys()]).toEqual(
      [
        "root",
        "path",
        "r1/root",
        "r1/name",
        "r2/root",
        "r2/name",
        "spots",
        "r3/root",
        "r3/icon",
        "r3/name",
        "r3/count",
        "here",
      ].map((part) => `${root}/${part}`),
    );
    for (const id of ["r1", "r2", "r3"])
      expect(parts.get(`${root}/${id}/root`)?.attributes).toContain('role="link"');
    const count = parts.get(`${root}/r3/count`);
    expect(count?.children[0]?.text).toEqual(["1"]);
    expect(count?.text).toEqual([" item"]);
    expect([...render({ ...full, detail: "brief", density: "compact", surface: "outlined" }).keys()]).toEqual(
      [...parts.keys()].filter((key) => !key.endsWith("/count")),
    );
    expect(render(full, "filled", {}).has(`${root}/r3/count`)).toBe(false);
  });

  it("leaves a location's path navigable when it has no children or contents", () => {
    const parts = render({ ...empty, path: full.path });
    expect(parts.has(`${root}/path`)).toBe(true);
    expect(parts.has(`${root}/spots`)).toBe(false);
    expect(parts.has(`${root}/r2/root`)).toBe(true);
    expect(parts.get(`${root}/here`)?.text).toEqual(["Stored here"]);
  });

  it("shows an intentional empty state and does not offer press in the explicit empty state", () => {
    expect(render(empty).get(`${root}/empty`)?.text).toEqual(["Nothing stored here"]);
    expect(render(full, "empty").get(`${root}/empty`)?.text).toEqual(["Nothing here yet"]);
    expect(affordancesOf(meta, props.parse(full), "s1", {}, "empty")).toEqual([]);
  });
});

describe("Storage read and act", () => {
  it("reads the same counts and navigates every linked ancestor and child without confirmation", () => {
    const onLink = vi.fn();
    const controller = createScreenController({
      screen: { id: "home", components: [{ id: "s1", c: "Storage", ...full }] },
      defs: { Storage: def },
      deviceData: data,
      onLink,
    });
    expect(controller.read()).toContain('r3 "Drawer" 1 item');
    expect(controller.read()).toContain('"Screws"');
    for (const [part, destination] of [
      ["r1", "workshop"],
      ["r2", "back_shelf"],
      ["r3", "drawer"],
    ]) {
      const address = `s1/${part}`;
      expect(controller.read()).toContain(`[${address} press→${destination}]`);
      expect(controller.press(address).ok).toBe(true);
      expect(onLink).toHaveBeenLastCalledWith(destination, `home/${address}`);
    }
    expect(controller.press("s1/r3/count").ok).toBe(false);
  });

  it("does not offer press on a breadcrumb without a routable label", () => {
    const input = { ...full, path: ["🌿"] };
    expect(affordancesOf(meta, stampItemIds(meta, props.parse(input)), "s1")).toEqual([
      { address: "s1/r2", part: "root", action: "press", detail: "→drawer" },
    ]);
    expect(render(input).get(`${root}/r1/root`)?.attributes).not.toContain('role="link"');
  });
});
