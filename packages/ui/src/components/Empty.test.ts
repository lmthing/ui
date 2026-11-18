import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  emptyLine,
  placeholderDetail,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { KitCard, KitEmpty } from "@lmthing/ui/kit";
import { Empty } from "./Empty";

const { props, meta, examples, fallback, probes } = components.Empty;

describe("Empty schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims text and leaves optional fields absent", () => {
    const derived = { kind: "none", retryable: false };
    expect(props.parse({ title: "  Nothing here yet  " })).toEqual({ ...derived, title: "Nothing here yet" });
    expect(props.parse({ title: "  Nothing here yet  ", sub: "  Details  ", icon: "info" })).toEqual({
      ...derived,
      title: "Nothing here yet",
      sub: "Details",
      icon: "info",
    });
  });
  it.each([
    {},
    { title: "" },
    { title: " ".repeat(4) },
    { title: "a".repeat(41) },
    { title: 4 },
    { title: "Nothing here yet", sub: "" },
    { title: "Nothing here yet", sub: " ".repeat(4) },
    { title: "Nothing here yet", sub: "a".repeat(101) },
    { title: "Nothing here yet", sub: 4 },
    { title: "Nothing here yet", icon: "unknown" },
    { title: "Nothing here yet", style: "plain" },
    { title: "Nothing here yet", color: "red" },
    { title: "Nothing here yet", pixels: 4 },
    { title: "Nothing here yet", id: "e1" },
    { title: "Nothing here yet", goto: "next" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts the exact maximum lengths", () => {
    expect(props.safeParse({ title: "a".repeat(40), sub: "a".repeat(100), icon: "leaf" }).success).toBe(true);
  });
  it("types view props without validator item ids", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["title"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["sub"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("id");
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("Empty fallback", () => {
  it("validates empty, matching, mixed and malformed casts", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      { things: [{ type: "entry", fields: ["heading"] }], items: [] },
      {
        things: [
          { type: "category", fields: [] },
          { type: "entry", fields: [] },
        ],
        items: [{ id: "first", type: "entry", sample: true, heading: "First" }],
      },
      {
        things: [],
        items: [{ id: "first", type: "entry", sample: true, heading: 4 }],
      },
      { things: [{ type: "  ", fields: [] }], items: [] },
      { things: [{ type: "x".repeat(80), fields: [] }], items: [] },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[0]! })).toEqual({
      title: emptyLine(),
      sub: placeholderDetail,
    });
    expect(fallback({ cast: casts[1]! }).title).toBe("No entries yet");
    expect(fallback({ cast: casts[2]! }).title).toBe("No categories yet");
    expect(fallback({ cast: casts[3]! }).title).toBe(emptyLine());
    expect(fallback({ cast: casts[4]! }).title).toBe(emptyLine());
    expect(fallback({ cast: casts[5]! }).title).toHaveLength(40);
  });
  it.each([
    ["storage_box", "No storage boxes yet"],
    ["address", "No addresses yet"],
    [" CATEGORY ", "No categories yet"],
    ["entry", "No entries yet"],
  ])("uses shared empty copy for %s", (type, title) => {
    expect(fallback({ cast: { things: [{ type, fields: [] }], items: [] } })).toEqual({
      title,
      sub: placeholderDetail,
    });
  });
});

describe("Empty metadata and probes", () => {
  it("has the required metadata and well-formed choose and write probes", () => {
    expect(meta).toMatchObject({
      id: "Empty",
      group: "content",
      region: "body",
      weight: 2,
      tier: "phone",
      parts: ["root", "icon", "title", "sub", "retry"],
      states: ["filled"],
    });
    expect(meta).not.toHaveProperty("items");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Hero");
    expect(meta.pick).toContain("Banner");
    expect(meta.pick).toContain("Note");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Empty")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Hero")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Empty" });
    expect(probes.map((probe) => probe.kind)).not.toContain("read");
    for (const probe of probes) {
      const wording = probe.kind === "choose" ? probe.need : probe.brief;
      for (const name of [meta.id, "Hero", "Note", ...meta.aliases])
        expect(wording).not.toMatch(new RegExp(`\\b${name}\\b`, "i"));
    }
    expect(examples.some((example) => "icon" in example)).toBe(true);
    expect(examples.some((example) => "sub" in example)).toBe(true);
  });
  it("keeps the near miss about one main number with supporting text", () => {
    const nearMiss = probes.find((probe) => probe.kind === "choose" && probe.expect === "Hero");
    expect(nearMiss).toMatchObject({
      kind: "choose",
      need: "Make 2 the single large main number on my plant screen, with plants need water today underneath",
      expect: "Hero",
    });
    if (nearMiss?.kind !== "choose") throw new Error("Missing main-number near miss");
    for (const component of [components.Empty, components.Hero, components.Banner])
      for (const name of [component.meta.id, ...component.meta.aliases])
        expect(nearMiss.need).not.toMatch(new RegExp(`\\b${name}\\b`, "i"));
  });
  it("builds a data-only registry with case and separator tolerant aliases", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Empty");
    expect(registry.schema("Empty")).toBe(props);
    expect(registry.resolve("BLANK")).toBe("Empty");
    expect(registry.resolve("un-started")).toBe("Empty");
    expect(registry.resolve("unknown")).toBeUndefined();
  });
});

describe("Empty view", () => {
  it.each(examples)("draws the standalone kit empty state with a root address", (example) => {
    const parsed = props.parse(example);
    const view = Empty(parsed);
    expect(view.type).toBe(KitCard);
    expect(view.props).toMatchObject({ style: "plain", part: "root" });
    const [empty] = [view.props.children].flat();
    expect(empty.type).toBe(KitEmpty);
    const { title, sub, icon } = parsed;
    const shown = icon ?? { none: undefined, error: "alert", offline: "wifi" }[parsed.kind];
    expect(empty.props).toEqual({
      title,
      ...(sub ? { sub } : {}),
      ...(shown ? { icon: shown } : {}),
      fill: true,
    });
  });
  it.each(examples)("reads the shown content and offers a retry only after a failure", (example) => {
    const parsed = props.parse(example);
    const read = readComponent(components.Empty, example, "e1").join("\n");
    expect(read).toContain(`"${parsed.title}"`);
    if (parsed.sub) expect(read).toContain(`"${parsed.sub}"`);
    expect(affordancesOf(meta, parsed, "e1")).toEqual(
      parsed.kind === "none" ? [] : [{ address: "e1/retry", part: "retry", action: "press", detail: "" }],
    );
  });
});

describe("Empty kinds", () => {
  it.each([
    { title: "Nothing here yet", kind: "weird" },
    { title: "Nothing here yet", retryable: true },
  ])("rejects an unknown kind or a written retry flag", (input) =>
    expect(props.safeParse(input).success).toBe(false),
  );
  it("draws a retry button with a default icon for a failure or offline", () => {
    for (const kind of ["error", "offline"] as const) {
      const view = Empty(props.parse({ title: "Oops", kind }));
      const [empty, retry] = [view.props.children].flat();
      expect(empty.props.icon).toBe(kind === "error" ? "alert" : "wifi");
      expect(retry.props).toMatchObject({ part: "retry", kind: "secondary", full: true });
    }
    const quiet = Empty(props.parse({ title: "Nothing" }));
    expect([quiet.props.children].flat().filter(Boolean)).toHaveLength(1);
  });
});
