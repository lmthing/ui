import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  charLine,
  components,
  createRegistry,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { renderInstance } from "../../test/render";

const { props, meta, examples, fallback, probes } = components.Composer;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

describe("Composer schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults and trims text", () => {
    expect(props.parse({ hint: " Write here " })).toEqual({
      style: "entry",
      hint: "Write here",
      max: 600,
      sendable: false,
      detail: "full",
    });
  });
  it.each([
    {},
    { hint: "" },
    { hint: "a".repeat(61) },
    { hint: "Write", label: "a".repeat(25) },
    { hint: "Write", max: 79 },
    { hint: "Write", max: 2001 },
    { hint: "Write", max: 80.5 },
    { hint: "Write", max: 100, value: "a".repeat(101) },
    { hint: "Write", value: "a".repeat(2001), max: 2000 },
    { hint: "Write", value: "" },
    { hint: "Write", style: "chat" },
    { hint: "Write", density: "compact" },
    { hint: "Write", detail: "none" },
    { hint: "Write", goto: "next" },
    { hint: "Write", color: "red" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts the exact limits", () => {
    expect(
      props.safeParse({ hint: "a".repeat(60), label: "a".repeat(24), max: 2000, value: "a".repeat(2000) })
        .success,
    ).toBe(true);
    expect(props.safeParse({ hint: "x", max: 80, value: "a".repeat(80) }).success).toBe(true);
  });
  it("types view props without presentation overrides", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["style"]>().toEqualTypeOf<"entry" | "reply">();
    expectTypeOf<ViewProps["max"]>().toEqualTypeOf<number>();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("Composer fallback, metadata and actions", () => {
  it("validates with empty, full and malformed cast content", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      { things: [{ type: "entry", fields: ["text"] }], items: [] },
      { things: [{ type: "entry", fields: ["x".repeat(100)] }], items: [] },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[1]! }).hint).toBe("text");
  });
  it("types into the box and offers send only for a reply, marked as needing people", () => {
    const entry = props.parse(examples[0]);
    expect(affordancesOf(meta, entry, "c1")).toEqual([
      { address: "c1/field", part: "field", action: "type", detail: "" },
    ]);
    const reply = props.parse(examples[1]);
    expect(affordancesOf(meta, reply, "c1").map((a) => `${a.address} ${a.action}`)).toEqual([
      "c1/field type",
      "c1/send send",
    ]);
    const line = readComponent(components.Composer, examples[1], "c1").join(" ");
    expect(line).toMatch(/\[c1\/send send !needs-people\]/);
    expect(line).not.toMatch(/\[c1\/field type[^\]]*!needs/);
  });
  it("counts what is written against the limit", () => {
    expect(charLine(42, 600)).toBe("42 / 600");
  });
  it("has well-formed probes naming the nearest neighbour", () => {
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    for (const near of ["Field", "Search"]) expect(meta.pick).toContain(near);
    expect(probes.filter((probe) => probe.kind === "choose").map((probe) => probe.expect)).toEqual([
      "Composer",
      "Field",
    ]);
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Composer" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 1,
      expect: { address: "c1/send", action: "send" },
    });
    for (const probe of probes) {
      const wording = probe.kind === "choose" ? probe.need : probe.kind === "write" ? probe.brief : "";
      for (const name of [meta.id]) expect(wording).not.toMatch(new RegExp(`\\b${name}\\b`, "i"));
    }
  });
  it("resolves its ids", () => {
    const registry = createRegistry();
    expect(registry.resolve("c-o-m-p-o-s-e-r")).toBe("Composer");
    expect(registry.resolve("c-o-m-p-o-s-e-r")).toBe("Composer");
  });
});

describe("Composer rendering", () => {
  it("draws an entry with a multi-line box and a count, and no send", () => {
    const html = renderInstance("Composer", examples[0], "filled", theme);
    expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
    for (const part of ["label", "field", "count"]) expect(html).toContain(`data-testid="home/c1/${part}"`);
    expect(html).not.toContain('data-testid="home/c1/send"');
    expect(html).toContain("0 / 400");
    expect(html).toContain("<textarea");
  });
  it("draws a reply with its text and a send button, and no count", () => {
    const html = renderInstance("Composer", examples[1], "filled", theme);
    expect(html).toContain('data-testid="home/c1/send"');
    expect(html).not.toContain('data-testid="home/c1/count"');
    expect(html).toContain("Thanks, see you at nine");
  });
  it("hides only the entry count from the drawing and the reader, not the limit", () => {
    const input = { ...examples[0], detail: "brief" } as const;
    expect(meta.variantParts["detail.brief"]).toEqual({ hides: ["count"] });
    const html = renderInstance("Composer", input, "filled", theme);
    for (const part of ["root", "label", "field"]) expect(html).toContain(`data-testid="home/c1/${part}"`);
    expect(html).not.toContain('data-testid="home/c1/count"');
    expect(html).toContain('maxLength="400"');
    const read = readComponent(components.Composer, input, "c1").join("\n");
    expect(read).not.toContain(charLine(0, 400));
    expect(read).toContain("[c1/field type");
  });
  it("keeps Send visible and actionable for a reply with brief detail", () => {
    const input = { ...examples[1], detail: "brief" } as const;
    const html = renderInstance("Composer", input, "filled", theme);
    expect(html).toContain('data-testid="home/c1/send"');
    expect(html).not.toContain('data-testid="home/c1/count"');
    expect(affordancesOf(meta, props.parse(input), "c1").map(({ action }) => action)).toEqual([
      "type",
      "send",
    ]);
    expect(readComponent(components.Composer, input, "c1").join("\n")).toContain("[c1/send send");
  });
});
