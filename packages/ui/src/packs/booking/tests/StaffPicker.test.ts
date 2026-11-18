import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  anyoneLabel,
  components,
  createRegistry,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
  type ScreenLike,
} from "@lmthing/ui/catalog";
import { createInteractionStore, createScreenController, projectScreen } from "@lmthing/ui/kit";
import { elementAt, renderInstance, styleAt } from "../../../../test/render";

const { props, meta, examples, fallback, probes } = components.StaffPicker;
const person = { name: "Anna", photo: "local:1" };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

describe("StaffPicker schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims text and applies the Anyone default without forcing a selection", () => {
    expect(props.parse({ staff: [{ ...person, name: " Anna ", role: " Care " }] })).toEqual({
      staff: [{ ...person, role: "Care" }],
      anyone: true,
    });
  });
  it.each([
    {},
    { staff: [] },
    { staff: Array(7).fill(person) },
    ...["", " ", "a".repeat(21), 4].map((name) => ({ staff: [{ ...person, name }] })),
    ...["", "a".repeat(21), 4].map((role) => ({ staff: [{ ...person, role }] })),
    ...[undefined, "https://example.org/photo.png", "lib:bad tag", `lib:${"a".repeat(65)}`].map((photo) => ({
      staff: [{ ...person, photo }],
    })),
    ...[-1, 1.5, 2, 7, "1", null].map((at) => ({ staff: [person], at })),
    { staff: [person], anyone: false, at: 0 },
    { staff: [person], anyone: "yes" },
    { staff: [person], style: "rows" },
    { staff: [person], color: "#fff" },
    ...["id", "pixels", "root"].map((key) => ({ staff: [{ ...person, [key]: "one" }] })),
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts exact limits and every allowed selection with either Anyone setting", () => {
    const staff = Array.from({ length: 6 }, () => ({
      name: "a".repeat(20),
      role: "b".repeat(20),
      photo: `lib:${"c".repeat(60)}`,
    }));
    for (const anyone of [false, true])
      for (const at of [undefined, 0, 1, 6])
        expect(props.safeParse({ staff, anyone, at }).success).toBe(at !== 0 || anyone);
    type View = Props<typeof props, typeof meta>;
    expectTypeOf<View["staff"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<View>().not.toBeAny();
    expectTypeOf<View>().not.toHaveProperty("color");
  });
});

describe("StaffPicker fallback", () => {
  it("validates empty, matching, mixed, excessive and malformed casts", () => {
    const thing = { type: "person", fields: ["heading"] };
    const entry = { id: "one", type: "person", sample: true, heading: "Anna" };
    const matching = { things: [thing], items: [entry] };
    const casts: CastLike[] = [
      { things: [], items: [] },
      matching,
      { ...matching, items: [entry, { ...entry, id: "two", type: "other", heading: "Wrong type" }] },
      {
        ...matching,
        items: Array.from({ length: 8 }, (_, index) => ({
          ...entry,
          id: `person_${index}`,
          heading: "x".repeat(80),
        })),
      },
      { things: [], items: [{ id: "bad", type: "person", sample: false, name: 4 }] },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[0]! }).staff).toEqual([{ name: "Item one", photo: "local:1" }]);
    expect(fallback({ cast: casts[1]! }).staff).toEqual([person]);
    expect(fallback({ cast: casts[2]! }).staff).toEqual([person]);
    expect(fallback({ cast: casts[3]! }).staff).toHaveLength(3);
    expect(fallback({ cast: casts[3]! }).staff[0]?.name).toBe("x".repeat(20));
    expect(fallback({ cast: casts[4]! })).toEqual(fallback({ cast: casts[0]! }));
  });
});

describe("StaffPicker contract and probes", () => {
  it("keeps the provider-only contract and core-first near miss outside live registries", () => {
    expect(meta).toMatchObject({ id: "StaffPicker", status: "ready", tier: "people" });
    expect(meta.select).toEqual({ prop: "at", value: "position", parts: { anyone: 0 } });
    expect(meta.items).toEqual({ key: "staff", parts: ["root", "name", "photo", "role"] });
    expect(meta.states).toEqual(["filled", "loading"]);
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("People");
    expect(probes.filter((probe) => probe.kind === "choose").map((probe) => probe.expect)).toEqual([
      "StaffPicker",
      "People",
    ]);
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "StaffPicker" });
    expect(probes.filter((probe) => probe.kind === "read").map((probe) => probe.expect)).toEqual([
      { address: "s1/r1", action: "select" },
      { address: "s1/anyone", action: "select" },
    ]);
    expect(createRegistry().ids).not.toContain("StaffPicker");
    expect(createRegistry({ packs: ["booking"], includeDrafts: true }).schema("StaffPicker")).toBe(props);
  });
});

describe("StaffPicker states, parts and read/act", () => {
  it.each([false, true])("draws and offers only the available actions with anyone=%s", (anyone) => {
    const input = { staff: [person, { name: "Sam", photo: "lib:people", role: "Walker" }], anyone };
    const html = renderInstance("StaffPicker", input, "filled", theme);
    const reading = readComponent(components.StaffPicker, input, "s1").join("\n");
    expect(reading.includes(anyoneLabel)).toBe(anyone);
    expect(html.includes('data-testid="home/c1/anyone"')).toBe(anyone);
    expect(html.includes('data-testid="home/c1/anyone_photo"')).toBe(anyone);
    expect(html.includes('data-testid="home/c1/anyone_name"')).toBe(anyone);
    for (const part of ["name", "photo"]) expect(html).toContain(`home/c1/r1/${part}`);
    expect(html).not.toContain("home/c1/r1/role");
    expect(html).toContain("home/c1/r2/role");
    expect(affordancesOf(meta, stampItemIds(meta, props.parse(input)), "s1")).toEqual([
      ...(anyone ? [{ address: "s1/anyone", part: "anyone", action: "select", detail: "" }] : []),
      ...[1, 2].map((index) => ({ address: `s1/r${index}`, part: "root", action: "select", detail: "" })),
    ]);
    expect(elementAt(html, "home/c1/r1/root").attributes).toContain('role="button"');
    if (anyone) expect(elementAt(html, "home/c1/anyone").attributes).toContain('role="button"');
  });
  it("rings only the selected avatar, including Anyone and the last of six providers", () => {
    for (const at of [undefined, 0, 1, 6]) {
      const input = { staff: Array(6).fill(person), at };
      const html = renderInstance("StaffPicker", input, "filled", theme);
      for (let position = 0; position <= 6; position++) {
        const address = position ? `home/c1/r${position}/photo` : "home/c1/anyone_photo";
        expect(styleAt(html, address).includes("border-top-width:2px")).toBe(at === position);
      }
    }
  });
  it("loads an avatar rail without names or actionable parts", () => {
    const html = renderInstance("StaffPicker", examples[0], "loading", theme);
    expect(html).toContain('aria-busy="true"');
    expect(html).toMatch(/aria-hidden="true"[\s\S]*_o-0[\s\S]*>Anna</);
    expect(readComponent(components.StaffPicker, examples[0], "s1", "loading")).toEqual([
      "s1 StaffPicker (loading)",
    ]);
    expect(html).not.toContain('data-testid="home/c1/anyone"');
    expect(html).not.toContain("home/c1/r1/root");
  });
});

describe("StaffPicker selection dispatch", () => {
  it("projects repeated provider and Anyone selections through the real dispatcher", () => {
    const input = { staff: [person, { ...person, name: "Sam" }], anyone: true, at: 0 };
    const screen: ScreenLike = { id: "home", components: [{ id: "s1", c: "StaffPicker", ...input }] };
    const store = createInteractionStore();
    const controller = createScreenController({ screen, defs: components, store });
    for (const [target, at] of [
      ["r1", 1],
      ["r2", 2],
      ["anyone", 0],
      ["r1", 1],
    ] as const) {
      expect(controller.act({ address: `s1/${target}`, action: "select" })).toMatchObject({ ok: true });
      const {
        id: _id,
        c: _c,
        ...live
      } = projectScreen(screen, components, store.snapshot(), 0).components[0]!;
      expect(live.at).toBe(at);
      const html = renderInstance("StaffPicker", live, "filled", theme);
      expect(html).toContain(at === 0 ? "anyone_photo" : `r${at}/photo`);
      expect(controller.read()).toContain("!needs-people");
    }
    expect(controller.act({ address: "s1/r1", action: "select", value: 0 })).toMatchObject({ ok: false });
    controller.dispose();
    screen.components[0]!.anyone = false;
    screen.components[0]!.at = 1;
    const hidden = createScreenController({ defs: components, screen });
    expect(hidden.act({ address: "s1/anyone", action: "select" })).toMatchObject({ ok: false });
    hidden.dispose();
  });
});
