import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  readComponent,
  type CastLike,
  type Props,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance } from "../../../../../test/render";

const { props, meta, examples, fallback, probes } = components.Turns;
const ledge = examples[0]!;
const trot = examples[1]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const screen = { id: "home", components: [{ id: "t1", c: "Turns", ...ledge }] };
const roster = {
  ...ledge,
  people: [...ledge.people, { name: "Jo" }, { name: "Avery" }, { name: "Riley" }],
  at: 5,
};

it("omits portraits without changing the current person, queue, or actions", () => {
  expect(props.parse(ledge)).toMatchObject({ lead: "avatar", emphasis: "normal" });
  expect(props.safeParse({ ...ledge, lead: "icon" }).success).toBe(false);
  const html = renderInstance("Turns", { ...ledge, lead: "none" }, "filled", theme);
  expect(html).not.toMatch(/home\/c1\/r[1-3]\/photo/);
  for (const part of ["r1/name", "r2/name", "r3/name", "next", "skip"])
    expect(elementAt(html, `home/c1/${part}`)).toBeDefined();
});

describe("Turns contract", () => {
  it.each(examples)("accepts a real example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });
  it("keeps tiers, actions, and the People near miss", () => {
    expect(meta).toMatchObject({
      status: "ready",
      tier: "phone",
      weight: 2,
      states: ["filled"],
      partTiers: { next: "people", skip: "people" },
    });
    expect(meta.realPath).not.toBe("");
    expect(probes.filter((probe) => probe.kind === "choose").map((probe) => probe.expect)).toEqual([
      "Turns",
      "People",
    ]);
    expect(probes).toContainEqual(expect.objectContaining({ kind: "write", expect: "Turns" }));
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "read", expect: { address: "t1/next", action: "press" } }),
    );
  });
  it("includes Turns in a live registry exactly when home is ready", () => {
    expect(createRegistry({ packs: ["home"] }).ids.includes("Turns")).toBe(packReady("home"));
    expect(createRegistry({ packs: ["home"], includeDrafts: true }).schema("Turns")).toBe(props);
  });
});

describe("Turns boundaries", () => {
  it("accepts exact limits and trims authored strings; only view props get item ids", () => {
    const people = Array.from({ length: 6 }, () => ({ name: "a".repeat(16), photo: "local:1" }));
    expect(props.parse({ job: "x".repeat(24), people, at: 5 })).toMatchObject({ people });
    expect(props.parse({ ...ledge, job: " Mist the plants " }).job).toBe(ledge.job);
    expectTypeOf<Props<typeof props, typeof meta>["visiblePeople"][number]["id"]>().toEqualTypeOf<string>();
  });
  it.each([
    {},
    { ...ledge, job: "" },
    { ...ledge, job: "a".repeat(25) },
    { ...ledge, people: [] },
    { ...ledge, people: [ledge.people[0]] },
    { ...ledge, people: Array.from({ length: 7 }, () => ledge.people[0]) },
    { ...ledge, at: -1 },
    { ...ledge, at: 0.5 },
    { ...ledge, at: 3 },
    { ...roster, at: 6 },
    { ...ledge, color: "red" },
    { ...ledge, visiblePeople: [] },
    ...[
      { name: " " },
      { name: "a".repeat(17) },
      { photo: "https://example.org/portrait" },
      { photo: `lib:${"a".repeat(65)}` },
      { id: "r1" },
    ].map((patch) => ({ ...ledge, people: [{ ...ledge.people[0], ...patch }, ledge.people[1]] })),
  ])("rejects invalid wire data", (input) => expect(props.safeParse(input).success).toBe(false));
});

describe("Turns fallback", () => {
  it("clips and limits cast names without inventing a household duty", () => {
    const cast: CastLike = {
      things: [{ type: "person", fields: ["name"] }],
      items: Array.from({ length: 7 }, (_, index) => ({
        id: `person_${index}`,
        type: "person",
        sample: true,
        name: index === 0 ? "a".repeat(24) : "Alex",
      })),
    };
    const input = fallback({ cast });
    expect(props.safeParse(input).success).toBe(true);
    expect(input).toMatchObject({ job: "Item one", at: 0 });
    expect(input.people).toHaveLength(6);
    expect(input.people.slice(0, 2)).toEqual([{ name: "a".repeat(16) }, { name: "Alex" }]);
  });
  it.each([
    { items: [] },
    { items: [{ id: "p1", type: "person", sample: true, name: 17 }] },
    { items: [{ id: "p1", type: "person", sample: true, name: " " }] },
  ])("uses neutral placeholders without usable cast text", ({ items }) => {
    const input = fallback({ cast: { things: [], items } });
    expect(input.people.map(({ name }) => name)).toEqual(["Item one", "Item two"]);
    expect(props.safeParse(input).success).toBe(true);
  });
  it("tops a one-person cast up to the minimum", () => {
    const input = fallback({
      cast: { things: [], items: [{ id: "p1", type: "person", sample: true, name: "Sam" }] },
    });
    expect(input.people).toEqual([{ name: "Sam" }, { name: "Item two" }]);
    expect(props.safeParse(input).success).toBe(true);
  });
});

describe("Turns states and parts", () => {
  it("addresses the filled card, the wrapped queue, portraits and buttons", () => {
    const html = renderInstance("Turns", roster, "filled", theme);
    const at = (part: string) => elementAt(html, `home/c1/${part}`);
    for (const part of meta.parts) expect(at(part)).toBeDefined();
    for (const [index, name] of ["Riley", "Sam", "Alex"].entries()) {
      const id = `r${index + 1}`;
      for (const part of meta.items.parts) expect(at(`${id}/${part}`)).toBeDefined();
      expect(at(`${id}/photo`).attributes).toContain(`aria-label="${name}"`);
    }
    expect(at("r1/root").attributes).toContain('aria-label="Current turn: Riley"');
    expect(at("next").attributes).toContain('role="button"');
    expect(at("skip").attributes).toContain('role="button"');
    expect(html).not.toContain("home/c1/r4");
    expect(html).not.toContain("Avery");
  });
  it("never repeats the current holder in a two-person rotation", () => {
    const html = renderInstance("Turns", trot, "filled", theme);
    expect(elementAt(html, "home/c1/r1/root").attributes).toContain('aria-label="Current turn: Jo"');
    expect(elementAt(html, "home/c1/r2/root").attributes).toContain('aria-label="Alex"');
    expect(html).toContain("Up next");
    expect(html).not.toContain("home/c1/r3");
  });
  it("uses a host portrait when supplied and initials for the other people", () => {
    const resolvePhoto = vi.fn(() => "https://example.test/sam.png");
    const people = [{ ...ledge.people[0]!, photo: "local:1" }, ...ledge.people.slice(1)];
    const html = renderInstance("Turns", { ...ledge, people }, "filled", theme, { resolvePhoto });
    expect(resolvePhoto).toHaveBeenCalledExactlyOnceWith("local:1");
    expect(html).not.toContain(">S</span>");
    expect(html).toContain(">A</span>");
    expect(elementAt(html, "home/c1/r2/photo").attributes).toContain('aria-label="Alex"');
  });
});

describe("Turns read and act", () => {
  it("reads the current holder and displayed queue and offers only the two presses", () => {
    const read = readComponent(components.Turns, roster, "t1").join("\n");
    expect(read).toContain('"Mist the plants"');
    expect(read).toContain("Current turn: Riley");
    expect(read).toContain("Up next: Sam, Alex");
    expect(read).not.toContain("Avery");
    expect(read.match(/\[[^\]]+\]/g)).toEqual([
      "[t1/next press !needs-people]",
      "[t1/skip press !needs-people]",
    ]);
  });
  it.each(["next", "skip"])("dispatches %s distinctly through the controller", (part) => {
    const onAction = vi.fn();
    const runtime = createScreenController({ screen, defs: components, onAction });
    expect(runtime.press("t1/r1")).toMatchObject({ ok: false, code: "not_actionable" });
    expect(runtime.press(`t1/${part}`)).toMatchObject({ ok: true });
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: `home/t1/${part}`, action: "press" });
  });
});
