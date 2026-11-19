import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  placeholderDetail,
  placeholderTitle,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { elementAt, renderInstance, styleAt } from "../../test/render";
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const { props, meta, examples, fallback, probes } = components.Card;
describe("Card schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults, trims text and derives link presence", () => {
    expect(props.parse({ title: " Fern ", body: " Bathroom ", meta: " Today " })).toEqual({
      title: "Fern",
      body: "Bathroom",
      meta: "Today",
      emphasis: "normal",
      surface: "card",
      media: "thumb",
      detail: "full",
      tone: "neutral",
      linked: false,
    });
    expect(props.parse({ title: "Fern", goto: "fern" })).toMatchObject({ linked: true });
  });
  it("rejects missing titles, conflicting media and invalid fields", () => {
    expect(props.safeParse({}).success).toBe(false);
    expect(props.safeParse({ title: "Fern", icon: "leaf", photo: "lib:plants" }).success).toBe(false);
    const invalid = {
      title: ["", " ", 4, "a".repeat(41)],
      body: ["", " ", "a".repeat(121)],
      meta: ["", " ", "a".repeat(25)],
      icon: ["unknown", null],
      photo: ["https://example.org/image.png", `lib:${"a".repeat(61)}`, "local:0", "local:dog"],
      goto: ["", "Bad ID", "a".repeat(65)],
      style: ["plain", "tinted", "outlined", "media"],
      density: ["dense"],
      emphasis: ["large"],
      surface: ["inset"],
      media: ["wide"],
      detail: ["short"],
      tone: ["accent"],
      color: ["red"],
      ...Object.fromEntries(["pixels", "id", "linked", "root"].map((key) => [key, [true]])),
    };
    for (const [key, values] of Object.entries(invalid))
      for (const value of values)
        expect(props.safeParse({ title: "Fern", [key]: value }).success).toBe(false);
  });
  it("accepts exact maximum lengths, reference forms and all surfaces and tones", () => {
    for (const surface of meta.variants.surface)
      for (const tone of meta.variants.tone)
        expect(props.safeParse({ surface, tone, ...maximum }).success).toBe(true);
    expect(props.safeParse({ title: "Fern", photo: "local:1", goto: "back" }).success).toBe(true);
  });
  it("derives view props without item ids or visual overrides", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["title"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["media"]>().toEqualTypeOf<"thumb" | "none" | "icon" | "cover">();
    expectTypeOf<ViewProps["tone"]>().toEqualTypeOf<"neutral" | "good" | "warn" | "bad">();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("id");
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});
const maximum = {
  title: "a".repeat(40),
  body: "a".repeat(120),
  meta: "a".repeat(24),
  photo: `lib:${"a".repeat(60)}`,
  goto: "a".repeat(64),
};
const empty: CastLike = { things: [], items: [] };
function castOf(fields: string[], values: Record<string, unknown>): CastLike {
  return {
    things: [{ type: "entry", fields }],
    items: [{ id: "one", type: "entry", sample: true, ...values }],
  };
}
describe("Card fallback", () => {
  it("uses the first item's declared fields, clips limits and validates malformed casts", () => {
    const full = castOf(["heading", "detail"], { heading: "First", detail: "More details" });
    const mixed = castOf(["heading", "detail"], { heading: "First", detail: "Its detail" });
    mixed.things[0]!.type = "other";
    mixed.items.push({ id: "two", type: "other", sample: true, heading: "Second" });
    const malformed = castOf([], { heading: 4, detail: " " });
    malformed.items.push({ id: "two", type: "entry", sample: true, heading: "Do not skip ahead" });
    const casts: CastLike[] = [
      empty,
      full,
      mixed,
      castOf(["heading", "detail"], { heading: "x".repeat(80), detail: "y".repeat(160) }),
      malformed,
      castOf(["summary", "detail", "name"], { name: "Not first", summary: " First ", detail: " Second " }),
      castOf(["title"], { title: "Only a title" }),
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: empty })).toEqual({ title: placeholderTitle(0), body: placeholderDetail });
    expect(fallback({ cast: casts[1]! })).toEqual({ title: "First", body: "More details" });
    expect(fallback({ cast: casts[2]! })).toEqual({ title: "First", body: "Its detail" });
    expect(fallback({ cast: casts[3]! })).toEqual({ title: "x".repeat(40), body: "y".repeat(120) });
    expect(fallback({ cast: casts[4]! })).toEqual(fallback({ cast: empty }));
    expect(fallback({ cast: casts[5]! })).toEqual({ title: "First", body: "Second" });
    expect(fallback({ cast: casts[6]! }).body).toBe(placeholderDetail);
  });
});
describe("Card metadata and probes", () => {
  it("has the required contract and well-formed choose, write and read probes", () => {
    const choose = probes.filter((probe) => probe.kind === "choose");
    expect(choose.map((probe) => probe.expect)).toEqual(["Card", "List"]);
    for (const probe of choose)
      for (const name of [meta.id, "List", "Hero"])
        expect(probe.need).not.toMatch(new RegExp(`\\b${name}\\b`, "i"));
    expect(probes.filter((probe) => probe.kind === "write")).toMatchObject([
      { expect: "Card", variant: { axis: "media", value: "cover" } },
      { expect: "Card" },
    ]);
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 0,
      task: "Open the fern card",
      expect: { address: "c1", action: "press" },
    });
  });
});
describe("Card view and actions", () => {
  it.each(examples)("draws one themed card with its heading and optional content", (example) => {
    const html = renderInstance("Card", example, "filled", theme, { resolvePhoto: () => "local-photo-uri" });
    expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
    expect(elementAt(html, "home/c1/root").attributes).toContain(`role="${example.goto ? "link" : "list"}"`);
    for (const part of ["title", "body", "meta", "badge", "icon", "photo"] as const) {
      expect(html.includes(`data-testid="home/c1/${part}"`)).toBe(
        Boolean(example[part as keyof typeof example]),
      );
    }
    expect(html).toContain(example.title);
    if (example.media === "cover") expect(styleAt(html, "home/c1/photo")).toMatch(/aspect-ratio:\s*1\.777/);
    if (example.surface === "tinted")
      expect(styleAt(html, "home/c1/root")).toContain(`--${example.tone}Soft`);
    if (example.surface === "outlined") expect(styleAt(html, "home/c1/root")).toMatch(/border[^;]*:/);
  });
  it.each([undefined, "local-photo-uri"])("draws wide media only when resolved: %s", (source) => {
    const resolvePhoto = vi.fn(() => source);
    const html = renderInstance("Card", examples[0], "filled", theme, { resolvePhoto });
    expect(html.includes('data-testid="home/c1/photo"')).toBe(Boolean(source));
    if (source) expect(styleAt(html, "home/c1/photo")).toMatch(/aspect-ratio:\s*1\.777/);
    expect(resolvePhoto).toHaveBeenCalledWith("lib:plants");
  });
});
describe("Card actions and loading", () => {
  it.each([undefined, "fern", "back", "plant_details"])("links only with goto %s", (goto) => {
    const input = { title: "Fern", body: "Bathroom", meta: "Today", goto };
    const html = renderInstance("Card", input, "filled", theme);
    expect(elementAt(html, "home/c1/root").attributes).toContain(`role="${goto ? "link" : "list"}"`);
    expect(affordancesOf(meta, props.parse(input), "c1")).toEqual(
      goto ? [{ address: "c1", part: "root", action: "press", detail: `→${goto}` }] : [],
    );
    const read = readComponent(components.Card, input, "c1").join("\n");
    for (const text of ["Fern", "Bathroom", "Today"]) {
      expect(read).toContain(text);
      expect(html).toContain(text);
    }
    expect(read.includes("[c1 press")).toBe(Boolean(goto));
    expect(readComponent(components.Card, input, "c1", "loading")[0]).not.toContain('"');
  });
  it.each([undefined, "uri"])("loads only resolved media without navigation: %s", (source) => {
    for (const input of [examples[0], examples[1], examples[2], { title: "Title" }]) {
      const html = renderInstance("Card", input, "loading", theme, { resolvePhoto: () => source });
      expect(elementAt(html, "home/c1/root").attributes).toContain('role="list"');
      expect(html).not.toContain('data-testid="home/c1/title"');
      const checkHidden = (node: ReturnType<typeof elementAt>, hidden = false) => {
        const concealed = hidden || node.attributes.includes('aria-hidden="true"');
        if (node.tag === "span") expect(concealed).toBe(true);
        node.children.forEach((child) => checkHidden(child, concealed));
      };
      checkHidden(elementAt(html, "home/c1/root"));
      const firstPlaceholder = elementAt(html, "home/c1/root").children[0]!.children[0]!;
      expect(styleAt(html, firstPlaceholder).includes("aspect-ratio")).toBe(
        props.parse(input).media === "cover" && Boolean(source),
      );
    }
  });
});

it("keeps the title, badge and link when brief hides body and metadata from the view and reader", () => {
  const input = { ...examples[0], detail: "brief", badge: "Due today" };
  const html = renderInstance("Card", input, "filled", theme);
  const read = readComponent(components.Card, input, "c1").join(" ");
  for (const output of [html, read]) {
    expect(output).toContain("Fern");
    expect(output).toContain("Due today");
    expect(output).not.toMatch(/Bathroom|Water today/);
  }
  expect(read).toContain("[c1 press");
});
