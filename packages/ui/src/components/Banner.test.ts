import { describe, expect, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  placeholderDetail,
  readComponent,
  type CastLike,
} from "@lmthing/ui/catalog";
import { KitBlock, KitIcon, KitText } from "@lmthing/ui/kit";
import { Banner } from "./Banner";

const { props, meta, examples, fallback, probes } = components.Banner;

describe("Banner schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults, trims text and derives link presence", () => {
    expect(props.parse({ text: "  Current status  " })).toEqual({
      text: "Current status",
      media: "icon",
      tone: "warn",
      linked: false,
    });
    expect(props.parse({ text: "Current status", goto: "next" })).toMatchObject({ linked: true });
  });
  it.each([
    {},
    { text: "" },
    { text: " ".repeat(4) },
    { text: "a".repeat(81) },
    { text: 4 },
    { text: "Status", tone: "accent" },
    { text: "Status", tone: null },
    { text: "Status", icon: "unknown" },
    { text: "Status", icon: null },
    { text: "Status", goto: "" },
    { text: "Status", goto: "Bad ID" },
    { text: "Status", goto: "next-screen" },
    { text: "Status", goto: "a".repeat(65) },
    { text: "Status", goto: "https://example.org" },
    { text: "Status", goto: null },
    { text: "Status", color: "#ffffff" },
    { text: "Status", pixels: 4 },
    { text: "Status", style: "plain" },
    { text: "Status", media: "thumb" },
    { text: "Status", id: "b1" },
    { text: "Status", linked: true },
    { text: "Status", root: "next" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts exact maximum lengths, every tone and valid links", () => {
    for (const tone of ["neutral", "good", "warn", "bad"])
      expect(
        props.safeParse({ text: "a".repeat(80), tone, icon: "info", goto: "a".repeat(64) }).success,
      ).toBe(true);
    expect(props.safeParse({ text: "Status", goto: "next_screen_1" }).success).toBe(true);
    expect(props.safeParse({ text: "Status", goto: "back" }).success).toBe(true);
  });
});

describe("Banner fallback", () => {
  it("validates empty, full, mixed and malformed casts using the first item only", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "entry", fields: ["heading", "detail"] }],
        items: [{ id: "first", type: "entry", sample: true, heading: "First", detail: "More details" }],
      },
      {
        things: [{ type: "other", fields: ["name"] }],
        items: [
          { id: "first", type: "entry", sample: true, heading: "First" },
          { id: "second", type: "other", sample: true, name: "Second" },
        ],
      },
      {
        things: [{ type: "entry", fields: ["heading", "detail"] }],
        items: [
          { id: "first", type: "entry", sample: false, heading: "x".repeat(100), detail: "y".repeat(100) },
        ],
      },
      {
        things: [],
        items: [
          { id: "first", type: "entry", sample: true, heading: 4, detail: "  " },
          { id: "second", type: "entry", sample: true, heading: "Not the first" },
        ],
      },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[0]! })).toEqual({ text: placeholderDetail, tone: "neutral" });
    expect(fallback({ cast: casts[1]! })).toEqual({ text: "More details", tone: "neutral" });
    expect(fallback({ cast: casts[2]! }).text).toBe("First");
    expect(fallback({ cast: casts[3]! }).text).toBe("y".repeat(80));
    expect(fallback({ cast: casts[4]! }).text).toBe(placeholderDetail);
  });
  it("uses declared field order, prefers detail, then title, and clips at word boundaries", () => {
    const item = { id: "first", type: "entry", sample: true };
    const cast: CastLike = {
      things: [{ type: "entry", fields: ["heading", "detail"] }],
      items: [{ ...item, detail: `${"a".repeat(75)} longerword`, heading: "First" }],
    };
    expect(fallback({ cast }).text).toBe("a".repeat(75));
    cast.items[0]!.detail = "";
    cast.items[0]!.heading = "x".repeat(100);
    expect(fallback({ cast }).text).toBe("x".repeat(80));
  });
});

describe("Banner metadata and probes", () => {
  it("has the required metadata and conditional whole-banner action", () => {
    expect(meta).toMatchObject({
      id: "Banner",
      group: "content",
      region: "top",
      weight: 2,
      tier: "phone",
      parts: ["root", "icon", "text"],
      states: ["filled"],
      actions: { parts: { root: ["press"] }, when: { root: { linked: true } } },
    });
    expect(meta).not.toHaveProperty("items");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Note");
    expect(meta.pick).toContain("Hero");
  });
  it("has two choose probes with a near miss, two writes and one read", () => {
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Banner")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Note")).toBeDefined();
    expect(probes.filter((probe) => probe.kind === "write")).toHaveLength(2);
    expect(probes).toContainEqual(expect.objectContaining({ variant: { axis: "media", value: "none" } }));
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Banner" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 1,
      task: "Open the banner",
      expect: { address: "b1", action: "press" },
    });
    for (const probe of probes.filter((probe) => probe.kind === "choose"))
      for (const name of [meta.id, "Note", "Hero"])
        expect(probe.need).not.toMatch(new RegExp(`\\b${name}\\b`, "i"));
    expect(examples.some((example) => "icon" in example && "goto" in example)).toBe(true);
    expect(examples.some((example) => !("goto" in example))).toBe(true);
  });
  it("builds a data-only registry with case and separator tolerant ids", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Banner");
    expect(registry.schema("Banner")).toBe(props);
    expect(registry.resolve("b-a-n-n-e-r")).toBe("Banner");
    expect(registry.resolve("unknown")).toBeUndefined();
  });
});

describe("Banner view and actions", () => {
  it("hides the leading icon without changing the linked root address", () => {
    const parsed = props.parse({ text: "Current status", media: "none", icon: "info", goto: "next" });
    expect(meta.variantParts["media.none"]).toEqual({ hides: ["icon"] });
    expect(Banner(parsed).props.leading).toBe(false);
    expect(affordancesOf(meta, parsed, "b1")).toEqual([
      { address: "b1", part: "root", action: "press", detail: "→next" },
    ]);
  });
  it.each(["neutral", "good", "warn", "bad"] as const)("draws a %s panel and its default icon", (tone) => {
    const view = Banner(props.parse({ text: "Status", tone }));
    expect(view.type).toBe(KitBlock);
    expect(view.props).toMatchObject({ label: "Status", tone, goto: undefined });
    expect(view.props.leading.type).toBe(KitIcon);
    expect(view.props.leading.props).toMatchObject({
      name: { neutral: "info", good: "circle_check", warn: "alert", bad: "close" }[tone],
      tone: tone === "neutral" ? "accent" : tone,
      part: "icon",
    });
    expect(view.props.children.type).toBe(KitText);
    expect(view.props.children.props).toMatchObject({ role: "body", part: "text", children: "Status" });
    expect(view.props.trailing).toBeUndefined();
  });
  it.each([undefined, "next", "back", "next_screen_1"])("links only with goto %s", (goto) => {
    const input = { text: "Current status", icon: "bell", goto };
    const parsed = props.parse(input);
    const view = Banner(parsed);
    expect(view.props.leading.props.name).toBe("bell");
    expect(view.props.goto).toBe(goto);
    expect(affordancesOf(meta, parsed, "b1")).toEqual(
      goto ? [{ address: "b1", part: "root", action: "press", detail: `→${goto}` }] : [],
    );
    if (goto) {
      expect(view.props.trailing.type).toBe(KitIcon);
      expect(view.props.trailing.props).toEqual({ name: "chevron_right", decorative: true });
    } else expect(view.props.trailing).toBeUndefined();
    const read = readComponent(components.Banner, input, "b1").join("\n");
    expect(read).toContain(`"${view.props.children.props.children}"`);
    expect(read.includes("[b1 press")).toBe(Boolean(goto));
    expect(read).not.toContain("chevron");
  });
});
