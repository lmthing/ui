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
import { renderInstance } from "../../test/render";

const { props, meta, examples, fallback, probes } = components.Sheet;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const facts = [{ label: "When", value: "Tomorrow" }];
const six = ["A", "B", "C", "D", "E", "F"].map((label) => ({ label }));

describe("Sheet schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults and derives what each item does", () => {
    const detail = props.parse({ title: " Walk ", items: facts });
    expect(detail.style).toBe("detail");
    expect(detail.title).toBe("Walk");
    expect((detail.items[0] as { root?: string }).root).toBeUndefined();
    expect(
      (props.parse({ style: "picker", title: "Room", items: six }).items[0] as { root?: string }).root,
    ).toBe("select");
    const menu = props.parse({
      style: "menu",
      title: "Fern",
      items: [{ label: "Edit" }, { label: "Share" }],
    });
    expect((menu.items[1] as { root?: string }).root).toBe("press");
    expect(menu.items[1]?.danger).toBe(false);
  });
  it.each([
    {},
    { title: "Walk" },
    { title: "Walk", items: [] },
    { title: "", items: facts },
    { title: "a".repeat(41), items: facts },
    { title: "Walk", sub: "a".repeat(101), items: facts },
    { title: "Walk", items: [{ label: "When" }] },
    { title: "Walk", items: Array.from({ length: 7 }, () => facts[0]) },
    { title: "Walk", style: "picker", items: six.slice(0, 5) },
    { title: "Walk", style: "picker", items: Array.from({ length: 13 }, () => ({ label: "A" })) },
    { title: "Walk", style: "menu", items: [{ label: "Edit" }] },
    { title: "Walk", style: "menu", items: Array.from({ length: 7 }, () => ({ label: "A" })) },
    { title: "Walk", items: facts, at: 0 },
    { title: "Walk", style: "picker", items: six, at: 6 },
    { title: "Walk", style: "menu", items: [{ label: "A" }, { label: "B" }], action: { label: "Go" } },
    { title: "Walk", items: facts, action: { label: "" } },
    { title: "Walk", items: [{ label: "a".repeat(29), value: "x" }] },
    { title: "Walk", items: [{ label: "A", value: "a".repeat(29) }] },
    { title: "Walk", items: [{ label: "A", value: "x", root: "press" }] },
    { title: "Walk", items: facts, color: "red" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("is an overlay with no weight, and types view props", () => {
    expect(meta).toMatchObject({ region: "overlay", weight: 0, group: "action", tier: "phone" });
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["style"]>().toEqualTypeOf<"detail" | "picker" | "menu">();
    expectTypeOf<ViewProps["items"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("Sheet fallback, metadata and actions", () => {
  it("validates with empty, full and malformed cast content", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "walk", fields: ["name"] }],
        items: [{ id: "w", type: "walk", sample: true, name: "Park walk" }],
      },
      {
        things: [{ type: "walk", fields: ["name"] }],
        items: [{ id: "w", type: "walk", sample: true, name: 4 }],
      },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
  });
  it("closes, and per style offers press on an action, select on a picker or press on a menu", () => {
    const detail = stampItemIds(meta, props.parse(examples[0]));
    expect(affordancesOf(meta, detail, "s1").map((a) => `${a.address} ${a.action}${a.detail}`)).toEqual([
      "s1/close dismiss",
      "s1/action press→booking",
    ]);
    const picker = stampItemIds(meta, props.parse(examples[1]));
    expect(affordancesOf(meta, picker, "s1").map((a) => `${a.address} ${a.action}`)).toEqual([
      "s1/close dismiss",
      ...[1, 2, 3, 4, 5, 6].map((n) => `s1/r${n} select`),
    ]);
    const menu = stampItemIds(meta, props.parse(examples[2]));
    expect(affordancesOf(meta, menu, "s1").map((a) => `${a.address} ${a.action}${a.detail}`)).toEqual([
      "s1/close dismiss",
      "s1/r1 press→edit_plant",
      "s1/r2 press",
      "s1/r3 press",
    ]);
  });
  it("reads the facts of a detail and the chosen room of a picker", () => {
    expect(readComponent(components.Sheet, examples[0], "s1").join("\n")).toContain('"Tomorrow, 09:00"');
    expect(readComponent(components.Sheet, examples[1], "s1").join("\n")).toContain('"Living room"');
  });
  it("has well-formed probes naming the nearest neighbour", () => {
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    for (const near of ["Banner", "Choice", "Chips"]) expect(meta.pick).toContain(near);
    expect(probes.filter((probe) => probe.kind === "choose").map((probe) => probe.expect)).toEqual([
      "Sheet",
      "Banner",
    ]);
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Sheet" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      expect: { address: "s1/r3", action: "select" },
    });
    for (const probe of probes) {
      const wording = probe.kind === "choose" ? probe.need : probe.kind === "write" ? probe.brief : "";
      for (const name of [meta.id, ...meta.aliases])
        expect(wording).not.toMatch(new RegExp(`\\b${name}\\b`, "i"));
    }
  });
  it("resolves its aliases", () => {
    const registry = createRegistry();
    expect(registry.resolve("MODAL")).toBe("Sheet");
    expect(registry.resolve("bottom-sheet")).toBe("Sheet");
  });
});

describe("Sheet rendering", () => {
  it.each(examples.map((example) => [example.style, example] as const))(
    "draws a %s panel with a close button",
    (_, example) => {
      const html = renderInstance("Sheet", example, "filled", theme);
      expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
      for (const part of ["title", "close"]) expect(html).toContain(`data-testid="home/c1/${part}"`);
      expect(html).toContain('aria-label="Close"');
      props
        .parse(example)
        .items.forEach((_row, index) => expect(html).toContain(`data-testid="home/c1/r${index + 1}/root"`));
    },
  );
  it("ticks the chosen option of a picker and styles a dangerous menu item", () => {
    const picker = renderInstance("Sheet", examples[1], "filled", theme);
    expect(picker.match(/data-testid="home\/c1\/r5\/root"/g)).toHaveLength(1);
    const menu = renderInstance("Sheet", examples[2], "filled", theme);
    expect(menu).toContain("Remove");
  });
});
