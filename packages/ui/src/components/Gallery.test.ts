import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  migrateLine,
  placeholderTitle,
  stampItemIds,
  variants,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { elementAt, renderInstance, styleAt } from "../../test/render";
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const { props, meta, examples, fallback, probes } = components.Gallery;
const pair = [{ photo: "lib:entry" }, { photo: "local:1" }];
const resolvePhoto = (reference: string) => reference;
const viewProps = (input: unknown) =>
  stampItemIds(meta, props.parse(input)) as Props<typeof props, typeof meta>;

describe("Gallery schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("defaults, trims captions and derives link presence", () => {
    expect(
      props.parse({ photos: [{ photo: "lib:entry", caption: "  First  ", goto: "first" }, pair[1]] }),
    ).toEqual({
      arrange: "grid",
      aspect: "auto",
      detail: "full",
      photos: [
        { photo: "lib:entry", caption: "First", goto: "first", linked: true },
        { photo: "local:1", linked: false },
      ],
    });
  });
  it.each([
    {},
    { photos: [] },
    { photos: [pair[0]] },
    { photos: Array.from({ length: 7 }, () => pair[0]) },
    ...["", 4, "https://example.org/image.png", "lib:Bad ID", `lib:${"a".repeat(61)}`, "local:0"].map(
      (photo) => ({ photos: [{ photo }, pair[1]] }),
    ),
    ...["", "   ", "a".repeat(25), 4].map((caption) => ({ photos: [{ ...pair[0], caption }, pair[1]] })),
    ...["Bad ID", "a".repeat(65)].map((goto) => ({ photos: [{ ...pair[0], goto }, pair[1]] })),
    ...Object.entries({ id: "r1", linked: true, root: "first", pixels: 4 }).map(([key, value]) => ({
      photos: [{ ...pair[0], [key]: value }, pair[1]],
    })),
    { photos: pair, style: "wide" },
    { photos: pair, color: "red" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts exact maximum lengths and every supported count/style", () => {
    const entry = { photo: `lib:${"a".repeat(60)}`, caption: "a".repeat(24), goto: "a".repeat(64) };
    for (const arrange of ["grid", "strip"])
      for (const count of [2, 3, 4, 5, 6])
        expect(props.safeParse({ arrange, photos: Array.from({ length: count }, () => entry) }).success).toBe(
          true,
        );
  });
  it("adds item ids only to view props", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["photos"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["photos"][number]["caption"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<ViewProps["style"]>().toEqualTypeOf<"carousel" | undefined>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("Gallery fallback", () => {
  it("validates empty, singleton, mixed, malformed and oversized casts", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "entry", fields: ["heading"] }],
        items: [{ id: "one", type: "entry", sample: true, heading: "First" }],
      },
      {
        things: [
          { type: "entry", fields: ["heading"] },
          { type: "other", fields: ["name"] },
        ],
        items: [
          { id: "one", type: "other", sample: true, name: "Other" },
          { id: "two", type: "entry", sample: true, heading: "First" },
        ],
      },
      {
        things: [{ type: "Bad ID", fields: ["heading"] }],
        items: [{ id: "one", type: "Bad ID", sample: true, heading: 4 }],
      },
      {
        things: [{ type: "entry", fields: ["heading"] }],
        items: Array.from({ length: 8 }, (_, index) => ({
          id: `entry_${index}`,
          type: "entry",
          sample: false,
          heading: "x".repeat(80),
        })),
      },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[0]! }).photos).toEqual(
      [0, 1].map((index) => ({
        photo: `lib:item_${index ? "two" : "one"}`,
        caption: placeholderTitle(index),
      })),
    );
    expect(fallback({ cast: casts[1]! }).photos[0]).toEqual({ photo: "lib:entry", caption: "First" });
    expect(fallback({ cast: casts[1]! }).photos).toHaveLength(2);
    expect(fallback({ cast: casts[2]! }).photos).toEqual([
      { photo: "lib:other", caption: "Other" },
      { photo: "lib:entry", caption: "First" },
    ]);
    expect(fallback({ cast: casts[3]! })).toEqual(fallback({ cast: casts[0]! }));
    expect(fallback({ cast: casts[4]! }).photos).toHaveLength(6);
    expect(fallback({ cast: casts[4]! }).photos[0]?.caption).toBe("x".repeat(24));
  });
});

describe("Gallery metadata and probes", () => {
  it("declares only linked item root actions", () => {
    expect(meta.items).toEqual({ key: "photos", parts: ["root", "photo", "caption"] });
    expect(meta.parts).toEqual(["root"]);
    expect(meta.states).toEqual(["filled", "empty", "loading", "error"]);
    expect(meta.tier).toBe("phone");
    for (const goto of [undefined, "first", "back"]) {
      const input = { photos: [{ photo: "lib:entry", goto }, pair[1]] };
      expect(affordancesOf(meta, viewProps(input), "g1")).toEqual(
        goto ? [{ address: "g1/r1", part: "root", action: "press", detail: `→${goto}` }] : [],
      );
    }
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Photo");
    expect(meta.pick).toContain("List");
  });
  // prettier-ignore
  it("registers Gallery and its choose, write and read probes", () => {
    const registry = createRegistry();
    expect([registry.schema("Gallery"), registry.resolve("g-a-l-l-e-r-y")]).toEqual([props, "Gallery"]);
    expect(probes.filter((probe) => probe.kind === "choose").map(({ expect }) => expect)).toEqual([
      "Gallery",
      "Photo",
    ]);
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Gallery" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({ screen: 0, expect: { address: "g1/r1", action: "press" } });
  });
});

// prettier-ignore
describe("Gallery view", () => {
  it.each([2, 3, 4, 5, 6])("renders %i photos in the required grid columns", (count) => {
    const html = renderInstance("Gallery", { photos: Array.from({ length: count }, () => pair[0]) }, "filled", theme, { resolvePhoto });
    const grid = elementAt(html, "home/c1/root").children[0]!;
    const columns = count === 3 || count === 6 ? 3 : 2;
    expect(grid.children).toHaveLength(Math.ceil(count / columns));
    for (const row of grid.children) expect(row.children).toHaveLength(columns);
    for (let index = 1; index <= count; index++)
      expect(html).toContain(`data-testid="home/c1/r${index}/photo"`);
  });
  it.each(examples)("draws themed photos and captions in the requested layout", (example) => {
    const html = renderInstance("Gallery", example, "filled", theme, { resolvePhoto });
    const parsed = props.parse(example);
    for (const [index, entry] of parsed.photos.entries()) {
      const base = `home/c1/r${index + 1}`;
      expect(elementAt(html, `${base}/photo`).attributes).toContain('role="img"');
      const ratio = parsed.aspect === "tall" ? variants.aspect.tall : parsed.style === "carousel" || parsed.aspect === "wide" ? variants.aspect.wide : variants.aspect.square;
      expect(styleAt(html, `${base}/photo`)).toContain(`aspect-ratio:${ratio}`);
      expect(html.includes(`data-testid="${base}/caption"`)).toBe(Boolean(entry.caption));
      if (entry.caption) expect(html).toContain(entry.caption);
    }
  });
  it.each(examples)("keeps the loading layout and hides content when empty", (example) => {
    const html = renderInstance("Gallery", example, "loading", theme);
    expect(html.match(/aria-busy="true"/g)).toHaveLength(example.photos.length);
    expect(html).not.toContain('data-testid="home/c1/r1/photo"');
    const filled = renderInstance("Gallery", example, "filled", theme, { resolvePhoto });
    expect(styleAt(html, "home/c1/root")).toBe(styleAt(filled, "home/c1/root"));
    const layout = elementAt(html, "home/c1/root").children[0]!;
    expect(layout.children.length).toBe(elementAt(filled, "home/c1/root").children[0]!.children.length);
    const empty = renderInstance("Gallery", example, "empty", theme);
    expect(empty).toContain("Nothing here yet");
    expect(empty).not.toContain('data-testid="home/c1/r1/root"');
  });
});

it("collapses an unresolved carousel and does not re-address surviving photos", () => {
  const input = {
    style: "carousel",
    photos: [
      { ...pair[0], caption: "Missing" },
      { ...pair[1], caption: "Available" },
    ],
  };
  expect(renderInstance("Gallery", input, "filled", theme)).not.toContain("home/c1/");
  const partial = renderInstance("Gallery", input, "filled", theme, {
    resolvePhoto: (reference) => (reference === "local:1" ? reference : undefined),
  });
  expect(partial).not.toContain("Missing");
  expect(partial).not.toContain("home/c1/r1/");
  expect(partial).toContain('data-testid="home/c1/r2/photo"');
  expect(partial).toContain("Available");
  const error = renderInstance("Gallery", input, "error", theme);
  expect(error).toContain("Image unavailable");
  expect(error).not.toContain('role="img"');
});

// prettier-ignore
it.each(["strip", "grid"] as const)("migrates the legacy %s layout and keeps link addresses", (style) => {
  const legacy = { c: "Gallery", id: "g1", style, photos: [{ ...pair[0], caption: "First", goto: "first" }, pair[1]] };
  const { c, id, ...input } = migrateLine(legacy);
  expect({ c, id }).toEqual({ c: "Gallery", id: "g1" });
  expect(props.safeParse({ style, photos: legacy.photos }).success).toBe(false);
  expect(viewProps(input)).toMatchObject({ arrange: style, photos: [{ id: "r1" }, { id: "r2" }] });
  expect(migrateLine({ ...legacy, arrange: "grid" })).toMatchObject({ arrange: "grid" });
  const brief = viewProps({ ...input, detail: "brief" });
  expect(affordancesOf(meta, brief, "g1")).toEqual(affordancesOf(meta, viewProps(input), "g1"));
  expect(meta.variantParts["detail.brief"]).toEqual({ hides: ["caption"] });
});
