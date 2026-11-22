import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  emptyLine,
  packReady,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, elementAt, renderInstance } from "../../../../../test/render";

const def = components.Feed;
const { meta, props, examples, fallback, probes } = def;
const input = examples[0]!;
const post = input.posts[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

describe("Feed schema and bounds", () => {
  it.each(examples)("parses the domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("keeps the input order and full excerpt and stamps ids only for the view", () => {
    const text = "x".repeat(280);
    const next = props.parse({
      posts: [
        { ...post, text },
        { ...post, name: "   Second  " },
      ],
    });
    expect(next).toMatchObject({ media: "thumb", posts: [{ text }, { name: "Second" }] });
    type View = Props<typeof props, typeof meta>;
    expectTypeOf<View["posts"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<View>().not.toBeAny();
  });
  // prettier-ignore
  it.each([
    {},
    { posts: [] },
    { posts: Array(7).fill(post) },
    ...[
      { name: "x".repeat(25) }, { time: "x".repeat(13) }, { text: "x".repeat(281) }, { text: " " },
      { photo: undefined }, { photo: "https://example.org/photo" }, { image: "outside.png" },
      { likes: -1 }, { comments: 1000000 }, { comments: 1.5 }, { liked: "true" },
      { goto: "Bad ID" }, { goto: undefined }, { id: "r1" }, { pixels: 4 },
    ].map((patch) => ({ posts: [{ ...post, ...patch }] })),
    { ...input, media: "cover" },
    { ...input, style: "compact" },
    { ...input, color: "red" },
  ])("rejects invalid props", (value) => expect(props.safeParse(value).success).toBe(false));
  it("accepts exact limits and both photo reference forms", () => {
    // prettier-ignore
    const max = { ...post, name: "x".repeat(24), time: "x".repeat(12), text: "x".repeat(280),
      goto: "x".repeat(64), likes: 999999, comments: 999999, photo: "local:1", image: "lib:fern" };
    expect(props.safeParse({ posts: Array(6).fill(max) }).success).toBe(true);
  });
});

describe("Feed fallback and metadata", () => {
  it("uses neutral copy with no usable data and clips cast content to the contract", () => {
    const empty: CastLike = { things: [], items: [] };
    const matches: CastLike = {
      things: [{ type: "update", fields: ["name", "detail"] }],
      items: [{ type: "update", id: "recent", sample: true, name: "Jordan", detail: "x".repeat(300) }],
    };
    const malformed: CastLike = {
      ...matches,
      items: [{ type: "update", id: "Bad ID", sample: true, name: 5 }],
    };
    for (const cast of [empty, matches, malformed])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    // prettier-ignore
    expect(fallback({ cast: empty }).posts).toEqual([
      { name: "Item one", photo: "lib:people", time: "0", text: "Details", likes: 0, comments: 0, liked: false, goto: "post" },
    ]);
    expect(fallback({ cast: matches }).posts[0]).toMatchObject({ name: "Jordan", goto: "recent" });
    expect(fallback({ cast: matches }).posts[0]!.text).toHaveLength(280);
    expect(fallback({ cast: malformed }).posts[0]!.goto).toBe("post");
  });

  it("keeps the tier, states, pack gate and probe contract", () => {
    expect(meta).toMatchObject({
      weight: 3,
      dense: true,
      tier: "people",
      states: ["filled", "empty", "loading"],
    });
    expect(meta.realPath).toContain("shared app");
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Feed" }),
        expect.objectContaining({ kind: "choose", expect: "List" }),
        expect.objectContaining({ kind: "write", expect: "Feed", variant: { axis: "media", value: "none" } }),
        expect.objectContaining({ kind: "read", expect: { address: "f1/r1/like", action: "toggle" } }),
      ]),
    );
    expect(createRegistry({ packs: ["social"], includeDrafts: true }).schema("Feed")).toBe(props);
    expect(createRegistry({ packs: ["social"] }).ids.includes("Feed")).toBe(packReady("social"));
  });
});

describe("Feed states, parts and read", () => {
  it("renders and reads the counts and scopes the like button outside the post link", () => {
    const html = renderInstance("Feed", input, "filled", theme, { component: "f1" });
    const root = elementAt(html, "home/f1/r1/root");
    const parts = addressedElements(html);
    expect(root.attributes).toContain('role="link"');
    expect(root.children.map(({ attributes }) => attributes).join()).not.toContain('role="button"');
    expect(elementAt(html, "home/f1/r1/like").attributes).toMatch(
      /role="button".*Like Maya|Like Maya.*role="button"/,
    );
    expect(elementAt(html, "home/f1/r2/like").attributes).toContain("Unlike Sam");
    expect(parts.get("home/f1/r1/name")?.text).toEqual([post.name]);
    expect(parts.get("home/f1/r1/time")?.text).toEqual([post.time]);
    expect(parts.get("home/f1/r1/text")?.text).toEqual([post.text]);
    for (const [name, digit, suffix] of [
      ["likes", "7", " likes"],
      ["comments", "2", " comments"],
    ]) {
      const count = parts.get(`home/f1/r1/${name}`);
      expect(count?.children[0]?.text).toEqual([digit]);
      expect(count?.text).toEqual([suffix]);
    }
    const read = readComponent(def, input, "f1").join("\n");
    for (const line of [
      "r1: 7 likes · 2 comments",
      "r2: 3 likes · 1 comment",
      post.text,
      "[f1/r1 press→fern_post !needs-people]",
      "[f1/r1/like toggle:off !needs-people]",
      "[f1/r2/like toggle:on !needs-people]",
    ])
      expect(read).toContain(line);
  });
  it("hides just the attachments without changing addresses or link and toggle affordances", () => {
    const hidden = { ...input, media: "none" } as const;
    const parts = (value: unknown) => [
      ...addressedElements(renderInstance("Feed", value, "filled", theme)).keys(),
    ];
    expect(parts(input)).toContain("home/c1/r1/image");
    expect(parts(hidden)).toEqual(parts(input).filter((part) => !part.endsWith("/image")));
    expect(parts({ ...input })).toEqual(parts(input));
    const read = readComponent(def, hidden, "f1").join("\n");
    expect(read).not.toContain("photo:fern");
    expect(read).toContain("photo:people");
    expect(read).toContain("[f1/r1/like toggle:off !needs-people]");
  });
  it.each(["empty", "loading"] as const)("shows only the frame and no actions while %s", (state) => {
    const html = renderInstance("Feed", input, state, theme);
    expect([...addressedElements(html).keys()]).toEqual([
      "home/c1/root",
      ...(state === "empty" ? ["home/c1/empty"] : ["home/c1/r1/card", "home/c1/r2/card"]),
    ]);
    expect(html).toContain(state === "empty" ? emptyLine() : 'aria-busy="true"');
    expect(html).not.toContain(post.text);
    expect(readComponent(def, input, "f1", state)).toEqual([`f1 Feed (${state})`]);
    expect(affordancesOf(meta, stampItemIds(meta, props.parse(input)), "f1", {}, state)).toEqual([]);
  });
});

describe("Feed actions", () => {
  it("toggles either seed and only navigates when the post root is pressed", () => {
    const links: string[] = [];
    const runtime = createScreenController({
      screen: { id: "home", components: [{ ...input, c: "Feed", id: "f1" }] },
      defs: components,
      onLink: (goto) => {
        links.push(goto);
      },
    });
    try {
      for (const [id, initial] of [
        ["r1", false],
        ["r2", true],
      ] as const) {
        const step = { address: `f1/${id}/like`, action: "toggle" } as const;
        expect(runtime.act(step).ok).toBe(true);
        expect(runtime.store.get(`home/${step.address}`)).toBe(!initial);
        expect(runtime.act(step).ok).toBe(true);
        expect(runtime.store.get(`home/${step.address}`)).toBe(initial);
      }
      for (const part of ["photo", "likes", "comments", "image", "like"])
        expect(runtime.act({ address: `f1/r1/${part}`, action: "press" }).ok).toBe(false);
      expect(links).toEqual([]);
      expect(runtime.press("f1/r1").ok).toBe(true);
      expect(runtime.press("f1/r2").ok).toBe(true);
      expect(links).toEqual(["fern_post", "basil_post"]);
      expect(runtime.confirmation).toBeUndefined();
    } finally {
      runtime.dispose();
    }
  });
});
