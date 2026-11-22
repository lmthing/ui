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

const { props, meta, examples, fallback, probes } = components.Choice;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const two = [{ title: "Weekly" }, { title: "Monthly" }];

describe("Choice schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults, trims text and derives which option is chosen", () => {
    expect(props.parse({ options: [{ title: " Weekly " }, { title: "Monthly" }], at: 1 })).toEqual({
      detail: "full",
      options: [
        { title: "Weekly", on: false },
        { title: "Monthly", on: true },
      ],
      at: 1,
      multi: false,
    });
    expect(props.parse({ options: two }).options.every((option) => option.on === false)).toBe(true);
    expect(
      props
        .parse({ multi: true, options: [{ title: "A", on: true }, { title: "B" }] })
        .options.map((o) => o.on),
    ).toEqual([true, false]);
  });
  it("takes the first option written with on as the chosen one of a single choice", () => {
    const parsed = props.parse({
      options: [{ title: "A" }, { title: "B", on: true }, { title: "C", on: true }],
    });
    expect(parsed.options.map((option) => option.on)).toEqual([false, true, false]);
    expect(
      props.parse({ at: 0, options: [{ title: "A" }, { title: "B", on: true }] }).options.map((o) => o.on),
    ).toEqual([true, false]);
  });
  it.each([
    {},
    { options: [] },
    { options: [{ title: "Only one" }] },
    { options: Array.from({ length: 6 }, (_, i) => ({ title: `T${i}` })) },
    { options: [{ title: "" }, { title: "B" }] },
    { options: [{ title: "a".repeat(29) }, { title: "B" }] },
    { options: [{ title: "A", sub: "a".repeat(81) }, { title: "B" }] },
    { options: [{ title: "A", value: "a".repeat(17) }, { title: "B" }] },
    { options: [{ title: "A", badge: "a".repeat(13) }, { title: "B" }] },
    { options: [{ title: "A", icon: "unknown" }, { title: "B" }] },
    { options: two, question: "a".repeat(61) },
    { options: two, at: 2 },
    { options: two, at: -1 },
    { options: two, multi: true, at: 0 },
    { options: two, style: "grid" },
    { options: two, style: "list" },
    { options: two, surface: "tinted" },
    { options: two, detail: "hidden" },
    { options: [{ title: "A", goto: "x" }, { title: "B" }] },
    { options: two, color: "red" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("types view props with item ids and a derived chosen flag", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["options"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("Choice fallback, metadata and actions", () => {
  it("validates with empty, full and malformed cast content", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "plan", fields: ["name"] }],
        items: [
          { id: "a", type: "plan", sample: true, name: "Weekly" },
          { id: "b", type: "plan", sample: true, name: "Monthly" },
        ],
      },
      {
        things: [{ type: "plan", fields: ["name"] }],
        items: [{ id: "a", type: "plan", sample: true, name: 4 }],
      },
    ];
    for (const cast of casts) {
      const value = fallback({ cast });
      expect(props.safeParse(value).success).toBe(true);
      expect(value.options.length).toBeGreaterThanOrEqual(2);
    }
    expect(fallback({ cast: casts[1]! }).options.map((option) => option.title)).toEqual([
      "Weekly",
      "Monthly",
    ]);
  });
  it("offers select on every option of a single choice and toggle on a multiple one", () => {
    const single = stampItemIds(meta, props.parse({ options: two, at: 0 }));
    expect(affordancesOf(meta, single, "c1").map((a) => `${a.address} ${a.action}`)).toEqual([
      "c1/r1 select",
      "c1/r2 select",
    ]);
    const many = stampItemIds(
      meta,
      props.parse({ multi: true, options: [{ title: "A", on: true }, { title: "B" }] }),
    );
    expect(affordancesOf(meta, many, "c1")).toEqual([
      { address: "c1/r1", part: "root", action: "toggle", detail: ":on" },
      { address: "c1/r2", part: "root", action: "toggle", detail: ":off" },
    ]);
  });
  it("reads every option with its sentence", () => {
    const line = readComponent(components.Choice, examples[1]!, "c1").join("\n");
    for (const text of ["Single walk", "Weekly pack", "Most popular", "£65"]) expect(line).toContain(text);
  });
});

describe("Choice fallback, metadata and actions", () => {
  it("has well-formed probes naming the nearest neighbour", () => {
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    for (const near of ["Chips", "Field", "Segmented", "SwipeStack"]) expect(meta.pick).toContain(near);
    expect(probes.filter((probe) => probe.kind === "choose").map((probe) => probe.expect)).toEqual([
      "Choice",
      "Chips",
    ]);
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Choice" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      expect: { address: "c1/r2", action: "select" },
    });
    for (const probe of probes) {
      const wording = probe.kind === "choose" ? probe.need : probe.kind === "write" ? probe.brief : "";
      for (const name of [meta.id]) expect(wording).not.toMatch(new RegExp(`\\b${name}\\b`, "i"));
    }
  });
  it("resolves its ids", () => {
    const registry = createRegistry();
    expect(registry.resolve("c-h-o-i-c-e")).toBe("Choice");
    expect(registry.resolve("c-h-o-i-c-e")).toBe("Choice");
  });
});

describe("Choice rendering", () => {
  it.each(examples)("draws options as radios or ticks", (example) => {
    const html = renderInstance("Choice", example, "filled", theme);
    const parsed = props.parse(example);
    expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
    parsed.options.forEach((option, index) => {
      const tag = html.match(new RegExp(`<[^>]*data-testid="home/c1/r${index + 1}/root"[^>]*>`))?.[0];
      expect(tag).toContain(`role="${parsed.multi ? "checkbox" : "radio"}"`);
      expect(tag).toContain(`aria-checked="${option.on === true}"`);
    });
  });
  it("shows the badge and value of an option", () => {
    const html = renderInstance("Choice", examples[1]!, "filled", theme);
    expect(html).toContain('data-testid="home/c1/r2/badge"');
    expect(html).toContain('data-testid="home/c1/r2/value"');
    expect(html).toContain('data-testid="home/c1/question"');
  });
  it("draws a skeleton while loading", () => {
    expect(renderInstance("Choice", examples[0]!, "loading", theme)).toContain('aria-busy="true"');
  });
  it("hides explanations in brief detail but keeps values, badges, ids and selection", () => {
    const list = examples[1]!;
    const baseline = renderInstance("Choice", list, "filled", theme);
    const brief = { ...list, detail: "brief" };
    const html = renderInstance("Choice", brief, "filled", theme);
    expect(meta.variantParts["detail.brief"].hides).toEqual(["sub"]);
    expect(baseline).toContain('data-testid="home/c1/r2/sub"');
    expect(html).not.toContain('data-testid="home/c1/r2/sub"');
    for (const part of ["root", "title", "badge", "value"])
      expect(html).toContain(`data-testid="home/c1/r2/${part}"`);
    expect(readComponent(components.Choice, brief, "c1").join("\n")).not.toContain("Five walks");
    const actions = (wire: unknown) => affordancesOf(meta, stampItemIds(meta, props.parse(wire)), "c1");
    expect(actions(brief)).toEqual(actions(list));
  });
});
