import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.Post;
const { meta, props, examples, fallback, probes } = def;
const example = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const render = (input: unknown, state: "filled" | "loading" = "filled") =>
  renderInstance("Post", input, state, theme, { component: "p1" });
const parts = (input: unknown, state?: "filled" | "loading") => addressedElements(render(input, state));
const read = (input: unknown) => readComponent(def, input, "p1").join("\n");

describe("Post schema and bounds", () => {
  it.each(examples)("parses the domain example", (input) => {
    expect(props.safeParse(input).success).toBe(true);
  });
  it("trims input, applies defaults and retains all hidden attachments", () => {
    expect(props.parse({ ...example, name: "  Maya ", media: "none" })).toMatchObject({
      name: "Maya",
      media: "none",
      images: example.images,
    });
    expect(props.parse(example).media).toBe("cover");
    type View = Props<typeof props, typeof meta>;
    expectTypeOf<View["images"][number]>().toEqualTypeOf<string>();
    expectTypeOf<View>().not.toBeAny();
  });
  // prettier-ignore
  it.each([
    {},
    ...[
      { name: "a".repeat(25) }, { time: "a".repeat(13) }, { text: "a".repeat(1001) }, { text: " " },
      { images: undefined }, { images: Array(5).fill("lib:fern") }, { images: ["external.png"] },
      { photo: "https://example.org/avatar" }, { liked: "false" }, { likes: -1 }, { likes: 1.5 },
      { comments: -1 }, { comments: 1000000 }, { density: "small" }, { media: "thumb" },
      { color: "red" }, { goto: "details" }, { pixels: 4 },
    ].map((patch) => ({ ...example, ...patch })),
  ])("rejects invalid props", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts the exact maximums and both photo reference forms", () => {
    const input = {
      ...example,
      name: "a".repeat(24),
      time: "a".repeat(12),
      text: "a".repeat(1000),
      photo: "local:1",
      images: ["local:2", "lib:fern", "lib:basil", "lib:plants"],
      likes: 999999,
      comments: 999999,
    };
    expect(props.safeParse(input).success).toBe(true);
  });
});

describe("Post fallback and metadata", () => {
  it("uses matching cast content or neutral placeholders and respects bounds", () => {
    const empty: CastLike = { things: [], items: [] };
    const matches: CastLike = {
      things: [{ type: "update", fields: ["name", "detail"] }],
      items: [{ id: "one", type: "update", sample: true, name: "Jordan", detail: "a".repeat(1050) }],
    };
    const malformed: CastLike = {
      ...matches,
      items: [{ id: "one", type: "update", sample: true, name: 3 }],
    };
    for (const cast of [empty, matches, malformed])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: empty })).toEqual({
      name: "Item one",
      photo: "lib:people",
      time: "0",
      text: "Details",
      images: [],
      likes: 0,
      comments: 0,
      liked: false,
    });
    expect(fallback({ cast: matches }).name).toBe("Jordan");
    expect(fallback({ cast: matches }).text).toHaveLength(1000);
  });
  it("keeps the tier, states, pack gate and core-first probes", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "people", weight: 2, states: ["filled", "loading"] });
    expect(meta.realPath).toContain("shared app");
    expect(meta.pick).toContain("Card");
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Post" }),
        expect.objectContaining({ kind: "choose", expect: "Card" }),
        expect.objectContaining({ kind: "write", expect: "Post" }),
        expect.objectContaining({ kind: "write", variant: { axis: "media", value: "none" } }),
        expect.objectContaining({ kind: "read", expect: { address: "p1/more", action: "press" } }),
      ]),
    );
    expect(createRegistry({ packs: ["social"], includeDrafts: true }).schema("Post")).toBe(props);
    expect(createRegistry({ packs: ["social"] }).ids.includes("Post")).toBe(packReady("social"));
  });
});

describe("Post states, parts and read", () => {
  it("draws the full text, counts, carousel and four separate action targets", () => {
    const html = render(example);
    const drawn = addressedElements(html);
    const at = (part: string) => drawn.get(`home/p1/${part}`);
    for (const part of ["name", "time", "text"] as const) expect(at(part)?.text).toEqual([example[part]]);
    expect(at("photo")?.attributes).toContain('aria-label="Maya"');
    expect(at("images")?.attributes).toContain("Post photo 1 of 2");
    expect(at("image_2")?.attributes).toContain("Post photo 2 of 2");
    expect(at("likes")?.text).toEqual(["7"]);
    expect(at("comments")?.text).toEqual(["2"]);
    for (const part of ["like", "comment", "share", "more"])
      expect(at(part)?.attributes).toContain('role="button"');
    expect(at("like")?.attributes).toContain("Like Maya");
    expect(render(examples[1])).toContain("Unlike Anna");
    const line = read(example);
    for (const word of [
      "7 likes · 2 comments",
      example.text,
      "photo:fern",
      "photo:plants",
      "[p1/like toggle:off !needs-people]",
      "[p1/comment press !needs-people]",
      "[p1/share press !needs-people]",
      "[p1/more press→sheet !needs-people]",
    ])
      expect(line).toContain(word);
  });
  it("keeps finish addresses stable and shows only visible attachment parts and references", () => {
    const images = ["lib:fern", "lib:plants", "lib:basil", "local:1"];
    const input = { ...example, images };
    const addresses = [...parts(input).keys()];
    const attachments = ["images", "image_2", "image_3", "image_4"].map((name) => `home/p1/${name}`);
    expect(addresses).toEqual(expect.arrayContaining(attachments));
    expect([...parts({ ...input }).keys()]).toEqual(addresses);
    const without = addresses.filter((address) => !attachments.includes(address));
    expect([...parts({ ...input, media: "none" }).keys()]).toEqual(without);
    expect([...parts({ ...input, images: [] }).keys()]).toEqual(without);
    expect([...parts({ ...input, images: images.slice(0, 1) }).keys()]).toContain(attachments[0]);
    const hidden = read({ ...input, media: "none" });
    expect(hidden).toContain("photo:people_maya");
    expect(hidden).not.toContain("photo:fern");
    expect(hidden).toContain("[p1/more press→sheet !needs-people]");
  });
  it("shows inert, unaddressed skeletons in loading", () => {
    const html = render(example, "loading");
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain('role="button"');
    expect([...addressedElements(html).keys()]).toEqual(["home/p1/root"]);
    expect(readComponent(def, example, "p1", "loading")).toEqual(["p1 Post (loading)"]);
  });
});

describe("Post controller", () => {
  it.each([false, true])("toggles a %s seed and dispatches comment and share independently", (liked) => {
    const onAction = vi.fn();
    const screen = { id: "home", components: [{ ...example, liked, c: "Post", id: "p1" }] };
    const runtime = createScreenController({ screen, defs: components, onAction });
    try {
      for (const next of [!liked, liked]) {
        expect(runtime.act({ address: "p1/like", action: "toggle" }).ok).toBe(true);
        expect(runtime.store.get("home/p1/like")).toBe(next);
      }
      onAction.mockClear();
      for (const part of ["comment", "share"]) expect(runtime.press(`p1/${part}`).ok).toBe(true);
      expect(onAction.mock.calls.map(([event]) => event)).toEqual([
        { address: "home/p1/comment", action: "press" },
        { address: "home/p1/share", action: "press" },
      ]);
      for (const part of ["name", "images", "likes", "comments", "like"])
        expect(runtime.act({ address: `p1/${part}`, action: "press" }).ok).toBe(false);
      expect(runtime.confirmation).toBeUndefined();
    } finally {
      runtime.dispose();
    }
  });
  it.each([0, 1, 2])("opens more only with one screen menu (%s supplied)", (count) => {
    const sheets = Array.from({ length: count }, (_, index) => ({
      ...components.Sheet.examples[1]!,
      c: "Sheet",
      id: `s${index}`,
    }));
    const screen = { id: "home", components: [{ ...example, c: "Post", id: "p1" }, ...sheets] };
    const runtime = createScreenController({ screen, defs: components });
    try {
      expect(runtime.press("p1/more").ok).toBe(count === 1);
      expect(runtime.openSheet).toBe(count === 1 ? "s0" : undefined);
      expect(runtime.confirmation).toBeUndefined();
    } finally {
      runtime.dispose();
    }
  });
});
