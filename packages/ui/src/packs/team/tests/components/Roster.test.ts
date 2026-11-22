import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { visibleTexts } from "../../../../../test/variants";
import {
  addressedElements,
  renderInstance,
  styleAt,
  type AddressedElement,
} from "../../../../../test/render";

const { Roster: def } = components,
  { props, meta, examples, fallback, probes } = def;
const first = examples[0]!;
const shift = first.shifts[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const view = (input: unknown, state: StateName = "filled") => renderInstance("Roster", input, state, theme);
const emptyCast: CastLike = { things: [], items: [] };
const split = {
  ...first,
  shifts: [{ ...shift, from: "13:00", to: "17:00", role: "Packing" }, shift, first.shifts[1]!],
};

function pathTo(root: AddressedElement, id: string): AddressedElement[] {
  if (root.attributes.includes(`data-testid="${id}"`)) return [root];
  for (const child of root.children) {
    const path = pathTo(child, id);
    if (path.length) return [root, ...path];
  }
  return [];
}

describe("Roster schema and boundaries", () => {
  it.each(examples)("accepts a real application example", (input) => {
    expect(props.safeParse(input).success).toBe(true);
  });
  it("accepts the exact limits and puts ids only on view shifts", () => {
    const people = Array.from({ length: 8 }, () => ({ name: ` ${"n".repeat(20)} `, photo: "local:1" }));
    const shifts = Array.from({ length: 40 }, () => ({ ...shift, person: 7, day: 6, role: "x".repeat(12) }));
    const input = props.parse({ ...first, people, shifts });
    expect(input).toMatchObject({ detail: "full" });
    expect(input.people[0]?.name).toBe("n".repeat(20));
    expect(props.safeParse({ ...first, people: people.slice(0, 1), shifts: [] }).success).toBe(true);
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["shifts"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["people"][number]>().not.toHaveProperty("id");
  });
  // prettier-ignore
  it.each([
    { ...first, week: "2026-11-17" }, { ...first, week: "2026-02-30" },
    { ...first, people: [] },
    { ...first, people: Array.from({ length: 9 }, () => first.people[0]) },
    { ...first, people: [{ name: "x".repeat(21), photo: "lib:people" }] },
    { ...first, people: [{ name: "Anna", photo: "https://example.org/person.png" }] },
    { ...first, shifts: Array.from({ length: 41 }, () => shift) },
    { ...first, density: "small" }, { ...first, detail: "short" },
    { ...first, color: "red" }, { ...first, cover: [true] }, {},
  ])("rejects invalid input %j", (input) => expect(props.safeParse(input).success).toBe(false));
  // prettier-ignore
  it.each([
    { person: -1 }, { person: 2 }, { person: 0.5 },
    { day: -1 }, { day: 7 }, { from: "24:00" }, { to: "7:00" },
    { role: "x".repeat(13) }, { id: "r1" },
  ])("rejects invalid shifts %j", (input) => {
    expect(props.safeParse({ ...first, shifts: [{ ...shift, ...input }] }).success).toBe(false);
  });
});
describe("Roster fallback and metadata", () => {
  it("uses bounded cast names or the shared neutral placeholder, without inventing shifts", () => {
    const cast: CastLike = {
      things: [{ type: "person", fields: ["name"] }],
      items: Array.from({ length: 10 }, (_, index) => ({
        id: `person_${index}`,
        type: "person",
        sample: true,
        name: index ? "x".repeat(40) : "Cameron",
      })),
    };
    const malformed: CastLike = {
      things: [],
      items: [{ id: "bad", type: "person", sample: true, name: 5 }],
    };
    for (const content of [emptyCast, cast, malformed]) {
      const input = fallback({ cast: content });
      expect(props.safeParse(input).success).toBe(true);
      expect(input.shifts).toEqual([]);
    }
    expect(fallback({ cast }).people).toHaveLength(8);
    expect(fallback({ cast }).people[0]).toEqual({ name: "Cameron", photo: "lib:people" });
    for (const content of [emptyCast, malformed])
      expect(fallback({ cast: content }).people[0]?.name).toBe(placeholderTitle(0));
  });
  it("keeps the dense people tier, core near miss, variant write and read probes", () => {
    expect(meta).toMatchObject({ tier: "people", dense: true, weight: 3 });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Timeline");
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Roster" }),
        expect.objectContaining({ kind: "choose", expect: "Timeline" }),
        expect.objectContaining({
          kind: "write",
          expect: "Roster",
          variant: { axis: "detail", value: "brief" },
        }),
        expect.objectContaining({ kind: "read", expect: { address: "r1/r3", action: "press" } }),
      ]),
    );
    expect(createRegistry({ packs: ["team"], includeDrafts: true }).schema("Roster")).toBe(props);
    expect(createRegistry({ packs: ["team"] }).ids.includes("Roster")).toBe(packReady("team"));
  });
});
describe("Roster rendering and reading", () => {
  it("renders the week, staff, cover and shift buttons", () => {
    const html = view(split);
    const parts = addressedElements(html);
    expect(parts.get("home/c1/week")?.text).toEqual(["Week of 16 Nov 2026"]);
    expect(parts.has("home/c1/matrix")).toBe(true);
    expect(parts.get("home/c1/portrait_1")?.attributes).toContain('aria-label="Anna"');
    expect(parts.get("home/c1/portrait_2")?.attributes).toContain('aria-label="Rae"');
    expect(parts.get("home/c1/cover")?.text).toEqual(["No cover: Tue, Wed, Thu, Fri, Sat, Sun"]);
    for (const id of ["r1", "r2", "r3"]) {
      expect(parts.get(`home/c1/${id}/root`)?.attributes).toContain('role="button"');
      expect(html.match(new RegExp(`data-testid="home/c1/${id}/root"`, "g"))).toHaveLength(1);
    }
    expect(html.indexOf("home/c1/r2/root")).toBeLessThan(html.indexOf("home/c1/r1/root"));
    const reading = readComponent(def, split, "r1").join("\n");
    expect(reading).toContain("\nAnna: Mon 07:00–12:00 Watering (r2), Mon 13:00–17:00 Packing (r1)\n");
    expect(reading).toContain("\nRae: Mon 12:00–17:00 Potting (r3)\n");
    expect(reading).toContain("No cover: Tue, Wed, Thu, Fri, Sat, Sun");
  });
  it("changes only role addresses for brief and none for finish axes", () => {
    const addresses = (input: unknown) => [...addressedElements(view(input)).keys()];
    const standard = addresses(first);
    expect(addresses({ ...first })).toEqual(standard);
    expect(addresses({ ...first })).toEqual(standard);
    const brief = { ...first, detail: "brief" };
    expect(addresses(brief)).toEqual(standard.filter((part) => !part.endsWith("/role")));
    expect(view(brief)).not.toContain("Watering");
    expect(readComponent(def, brief, "r1").join("\n")).not.toContain("Watering");
    expect(props.parse(brief).shifts[0]?.role).toBe("Watering");
  });
  it("tints today's column only when the calendar date falls inside the roster week", () => {
    const tinted = (html: string, id: string) =>
      pathTo(addressedElements(html).get("home/c1/matrix")!, `home/c1/${id}/root`).some((element) =>
        styleAt(html, element).includes("var(--accentSoft)"),
      );
    try {
      vi.setSystemTime(new Date(2026, 10, 16, 12));
      const thisWeek = view(first);
      expect(tinted(thisWeek, "r1")).toBe(true);
      expect(tinted(thisWeek, "r3")).toBe(false);
      vi.setSystemTime(new Date(2026, 10, 23, 12));
      expect(tinted(view(first), "r1")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
describe("Roster states and dispatch", () => {
  it("renders empty and loading without stale shift addresses or readings", () => {
    const addresses = (state: StateName) => [...addressedElements(view(first, state)).keys()];
    expect(addresses("empty")).toEqual(["home/c1/root", "home/c1/week", "home/c1/empty"]);
    expect(addresses("loading")).toEqual(["home/c1/root", "home/c1/matrix"]);
    expect(visibleTexts(view(first, "loading"))).not.toContain("Watering");
    expect(view({ ...first, shifts: [] })).toContain(">No shifts scheduled<");
    for (const state of ["empty", "loading"] as const)
      expect(readComponent(def, first, "r1", state)).toEqual([`r1 Roster (${state})`]);
  });
  it.each(["filled", "empty", "loading"] as const)("only dispatches scheduled shifts in %s", (state) => {
    const onAction = vi.fn();
    const screen = { id: "home", components: [{ ...split, id: "r1", c: "Roster", state }] };
    const runtime = createScreenController({ screen, defs: components, onAction });
    const live = state === "filled";
    const stamped = stampItemIds(meta, props.parse(split));
    expect(affordancesOf(meta, stamped, "r1", {}, state).map(({ address }) => address)).toEqual(
      live ? ["r1/r1", "r1/r2", "r1/r3"] : [],
    );
    for (const address of ["r1/r1", "r1/r2", "r1/r3"]) expect(runtime.press(address).ok).toBe(live);
    for (const address of ["r1/week", "r1/r1/role", "r1/r4"]) expect(runtime.press(address).ok).toBe(false);
    expect(runtime.confirmation).toBeUndefined();
    expect(onAction.mock.calls.map(([action]) => action.address)).toEqual(
      live ? ["home/r1/r1", "home/r1/r2", "home/r1/r3"] : [],
    );
    runtime.dispose();
  });
});
