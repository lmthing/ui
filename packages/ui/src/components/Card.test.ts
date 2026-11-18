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
import { KitCard, KitContent, KitSkeleton, KitText } from "@lmthing/ui/kit";
import { Card } from "./Card";
const { props, meta, examples, fallback, probes } = components.Card;
const host = vi.hoisted(() => ({ resolvePhoto: vi.fn(), state: "filled" }));
vi.mock("../kit", async (original) => ({
  ...(await original<typeof import("../kit")>()),
  useKit: () => host,
  useComponentState: () => host.state,
}));
describe("Card schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults, trims text and derives link presence", () => {
    const defaults = { style: "plain", title: "Fern", tone: "neutral", linked: false };
    expect(props.parse({ title: " Fern ", body: " Bathroom ", meta: " Today " })).toEqual({
      ...defaults,
      body: "Bathroom",
      meta: "Today",
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
      style: ["inset"],
      tone: ["accent"],
      color: ["red"],
      ...Object.fromEntries(["pixels", "id", "linked", "root"].map((key) => [key, [true]])),
    };
    for (const [key, values] of Object.entries(invalid))
      for (const value of values)
        expect(props.safeParse({ title: "Fern", [key]: value }).success).toBe(false);
  });
  it("accepts exact maximum lengths, reference forms and all styles and tones", () => {
    for (const style of ["plain", "tinted", "outlined", "media"])
      for (const tone of ["neutral", "good", "warn", "bad"])
        expect(props.safeParse({ style, tone, ...maximum }).success).toBe(true);
    expect(props.safeParse({ title: "Fern", photo: "local:1", goto: "back" }).success).toBe(true);
  });
  it("derives view props without item ids or visual overrides", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["title"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["style"]>().toEqualTypeOf<"plain" | "tinted" | "outlined" | "media">();
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
    expect(fallback({ cast: empty })).toEqual({
      style: "plain",
      title: placeholderTitle(0),
      body: placeholderDetail,
    });
    expect(fallback({ cast: casts[1]! })).toEqual({ style: "plain", title: "First", body: "More details" });
    expect(fallback({ cast: casts[2]! })).toEqual({ style: "plain", title: "First", body: "Its detail" });
    expect(fallback({ cast: casts[3]! })).toEqual({
      style: "plain",
      title: "x".repeat(40),
      body: "y".repeat(120),
    });
    expect(fallback({ cast: casts[4]! })).toEqual(fallback({ cast: empty }));
    expect(fallback({ cast: casts[5]! })).toEqual({ style: "plain", title: "First", body: "Second" });
    expect(fallback({ cast: casts[6]! }).body).toBe(placeholderDetail);
  });
});
describe("Card metadata and probes", () => {
  it("has the required contract and well-formed choose, write and read probes", () => {
    expect(meta).toMatchObject({ id: "Card", group: "content", region: "body", weight: 2, tier: "phone" });
    expect(meta.parts).toEqual(["root", "icon", "photo", "badge", "title", "body", "meta"]);
    expect(meta.states).toEqual(["filled", "loading"]);
    expect(meta.actions).toEqual({ parts: { root: ["press"] }, when: { root: { linked: true } } });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("List");
    expect(meta.pick).toContain("Hero");
    const choose = probes.filter((probe) => probe.kind === "choose");
    expect(choose.map((probe) => probe.expect)).toEqual(["Card", "List"]);
    for (const probe of choose)
      for (const name of [meta.id, "List", "Hero", ...meta.aliases])
        expect(probe.need).not.toMatch(new RegExp(`\\b${name}\\b`, "i"));
    expect(probes.filter((probe) => probe.kind === "write").map((probe) => probe.expect)).toEqual([
      "Card",
      "Card",
    ]);
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 0,
      task: "Open the fern card",
      expect: { address: "c1", action: "press" },
    });
    expect(examples.map((example) => example.style)).toEqual([
      "media",
      "tinted",
      "plain",
      "outlined",
      "plain",
    ]);
  });
});
describe("Card view and actions", () => {
  it.each(examples)("draws one card surface and a heading-led content group", (example) => {
    host.state = "filled";
    host.resolvePhoto.mockReturnValue("local-photo-uri");
    const view = Card(props.parse(example));
    expect(view.type).toBe(KitCard);
    expect(view.props).toMatchObject({
      style: "inset",
      look: ["tinted", "outlined"].includes(example.style) ? example.style : "surface",
      tone: example.style === "tinted" ? "good" : "neutral",
      clip: example.style === "media",
      padded: true,
      label: example.title,
    });
    const content = view.props.children.props.children[1];
    expect(content.type).toBe(KitContent);
    const parsed = props.parse(example);
    expect(content.props.leadingAlign).toBe(parsed.photo && example.style !== "media" ? "row" : "line");
    const heading = [content.props.children].flat().find((child) => child && child.type === KitText);
    expect(heading.props).toMatchObject({ role: "heading", part: "title" });
    if (example.style === "plain" && parsed.photo)
      expect(content.props.lead.props).toMatchObject({ photo: "lib:plants", part: "photo" });
  });
  it.each([undefined, "local-photo-uri"])("draws wide media only when resolved: %s", (source) => {
    host.state = "filled";
    host.resolvePhoto.mockReturnValue(source);
    const media = Card(props.parse(examples[0])).props.children.props.children[0];
    expect(Boolean(media)).toBe(Boolean(source));
    if (source) expect(media.props).toMatchObject({ photo: "lib:plants", shape: "wide", part: "photo" });
  });
});
describe("Card actions and loading", () => {
  it.each([undefined, "fern", "back", "plant_details"])("links only with goto %s", (goto) => {
    host.state = "filled";
    const input = { title: "Fern", body: "Bathroom", meta: "Today", goto };
    const parsed = props.parse(input);
    expect(Card(parsed).props.goto).toBe(goto);
    expect(affordancesOf(meta, parsed, "c1")).toEqual(
      goto ? [{ address: "c1", part: "root", action: "press", detail: `→${goto}` }] : [],
    );
    const read = readComponent(components.Card, input, "c1").join("\n");
    for (const text of ["Fern", "Bathroom", "Today"]) expect(read).toContain(text);
    expect(read.includes("[c1 press")).toBe(Boolean(goto));
    expect(readComponent(components.Card, input, "c1", "loading")[0]).not.toContain('"');
  });
  it.each([undefined, "uri"])("loads only resolved media without navigation: %s", (source) => {
    host.state = "loading";
    host.resolvePhoto.mockReturnValue(source);
    for (const input of [examples[0], examples[1], examples[2], { title: "Title" }]) {
      const parsed = props.parse(input);
      const view = Card(parsed);
      expect(view.props).toMatchObject({ goto: undefined, padded: false });
      expect(view.props.children.type === KitSkeleton && view.props.children.props).toMatchObject({
        rows: 1,
        shape: parsed.style === "media" && parsed.photo && source ? "media" : "rows",
        lead: parsed.style === "media" ? "none" : parsed.icon ? "dot" : parsed.photo ? "box" : "none",
        inset: "none",
      });
    }
  });
});
