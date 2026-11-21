import { describe, expect, expectTypeOf, it, vi } from "vitest";
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
import {
  addressedElements,
  elementAt,
  renderInstance,
  type RenderedElement,
} from "../../../../../test/render";

const def = components.Comments;
const { meta, props, examples, fallback, probes } = def;
const input = examples[0]!;
const seed = input.comments[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

function iconCount(node: RenderedElement): number {
  return Number(node.tag === "svg") + node.children.reduce((count, child) => count + iconCount(child), 0);
}

describe("Comments schema", () => {
  it.each(examples)("parses each domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("defaults the variants, trims author text, and stamps ids only after parsing", () => {
    const parsed = props.parse({ comments: [{ ...seed, name: "  Sam  " }] });
    expect(parsed).toMatchObject({ surface: "card", detail: "full" });
    expect(parsed.density).toBeUndefined();
    expect(parsed.comments).toEqual([seed]);
    expect(stampItemIds(meta, parsed).comments).toEqual([{ ...seed, id: "r1" }]);
    type View = Props<typeof props, typeof meta>;
    expectTypeOf<View["comments"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<View>().not.toBeAny();
  });
  // prettier-ignore
  it.each([
    {}, { comments: [] }, { comments: Array(7).fill(seed) },
    ...[
      { name: "x".repeat(25) }, { time: "x".repeat(13) }, { text: "x".repeat(241) }, { text: " " },
      { photo: "https://example.org/a.png" }, { likes: -1 }, { likes: 1000000 },
      { likes: 1.5 }, { reply: true }, { reply: "false" }, { id: "r1" }, { liked: true }, { pixels: 4 },
    ].map((patch) => ({ comments: [{ ...seed, ...patch }] })),
    { ...input, detail: "hidden" }, { ...input, style: "compact" }, { ...input, color: "red" },
  ])("rejects invalid input", (value) => expect(props.safeParse(value).success).toBe(false));
  it("accepts six entries, exact limits, and consecutive replies", () => {
    const bound = { ...seed, name: "x".repeat(24), time: "x".repeat(12), text: "x".repeat(240) };
    const root = { ...bound, likes: 999999, photo: "local:1" };
    const reply = { ...bound, likes: 0, reply: true };
    expect(props.parse({ comments: [root, reply, reply, root, reply, root] }).comments).toHaveLength(6);
  });
});

describe("Comments fallback and metadata", () => {
  it("uses neutral placeholders and bounds the cast-derived seed content", () => {
    const empty: CastLike = { things: [], items: [] };
    const matching: CastLike = {
      things: [{ type: "entry", fields: ["name", "detail"] }],
      items: [{ type: "entry", id: "entry", sample: true, name: "Jordan", detail: "x".repeat(260) }],
    };
    const malformed: CastLike = {
      ...matching,
      items: [{ type: "entry", id: "entry", sample: true, name: 5 }],
    };
    for (const cast of [empty, matching, malformed])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: empty }).comments).toEqual([
      { name: "Item one", photo: "lib:people", time: "0", text: "Details", likes: 0, reply: false },
    ]);
    expect(fallback({ cast: matching }).comments[0]).toMatchObject({
      name: "Jordan",
      text: "x".repeat(240),
      reply: false,
    });
  });
  it("has the expected tier, pack gate, and core-first probes", () => {
    expect(meta).toMatchObject({ tier: "people", dense: true, weight: 3, states: ["filled", "empty"] });
    expect(meta.realPath).toContain("Composer");
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Comments" }),
        expect.objectContaining({ kind: "choose", expect: "Bubbles" }),
        expect.objectContaining({ kind: "write", expect: "Comments" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: { address: "c1/r1/reply", action: "press" } }),
      ]),
    );
    expect(createRegistry({ packs: ["social"], includeDrafts: true }).schema("Comments")).toBe(props);
    expect(createRegistry({ packs: ["social"] }).ids.includes("Comments")).toBe(packReady("social"));
  });
});

describe("Comments states, parts and reading", () => {
  it("draws top-level comments and equally indented consecutive replies at stable addresses", () => {
    const reply = input.comments[1]!;
    const comments = [seed, reply, { ...reply, name: "Lee" }, { ...seed, name: "Jordan" }];
    const html = renderInstance("Comments", { comments }, "filled", theme);
    const parts = addressedElements(html);
    expect([...parts.keys()].sort()).toEqual(
      [
        "home/c1/root",
        ...comments.flatMap((_, i) => meta.items.parts.map((part) => `home/c1/r${i + 1}/${part}`)),
      ].sort(),
    );
    expect(comments.map((_, i) => iconCount(elementAt(html, `home/c1/r${i + 1}/root`)))).toEqual([
      2, 3, 3, 2,
    ]);
    expect(parts.get("home/c1/r3/root")?.attributes).toContain("Lee replying to Sam");
    expect(parts.get("home/c1/r2/text")?.text).toEqual([reply.text]);
    expect(parts.get("home/c1/r2/likes")?.text).toEqual(["1"]);
    for (const part of ["like", "reply", "more"])
      expect(parts.get(`home/c1/r2/${part}`)?.attributes).toContain('role="button"');
  });
  it("hides only timestamps in brief and keeps finish addresses stable", () => {
    const parts = (value: unknown) => [
      ...addressedElements(renderInstance("Comments", value, "filled", theme)).keys(),
    ];
    const brief = { ...input, detail: "brief" };
    expect(parts(brief)).toEqual(parts(input).filter((address) => !address.endsWith("/time")));
    expect(parts({ ...input, density: "compact", surface: "outlined" })).toEqual(parts(input));
    const read = readComponent(def, input, "c1").join("\n");
    for (const line of [
      "r2: Maya replying to Sam · 1 like",
      seed.time,
      seed.text,
      "[c1/r2/like toggle:off !needs-people]",
      "[c1/r2/reply press !needs-people]",
      "[c1/r2/more press !needs-people]",
    ])
      expect(read).toContain(line);
    expect(readComponent(def, brief, "c1").join("\n")).not.toContain(seed.time);
  });
  it("renders only the shared empty state and advertises no item actions while empty", () => {
    const html = renderInstance("Comments", input, "empty", theme, { thing: "comment" });
    const parts = addressedElements(html);
    expect([...parts.keys()]).toEqual(["home/c1/root", "home/c1/empty"]);
    expect(parts.get("home/c1/empty")?.text).toEqual([emptyLine("comment")]);
    expect(html).not.toContain('role="button"');
    expect(readComponent(def, input, "c1", "empty")).toEqual(["c1 Comments (empty)"]);
    expect(affordancesOf(meta, stampItemIds(meta, props.parse(input)), "c1", {}, "empty")).toEqual([]);
  });
});

describe("Comments actions", () => {
  it("keeps likes independent and dispatches Reply and More for the addressed comment", () => {
    const onAction = vi.fn();
    const screen = { id: "home", components: [{ ...input, id: "c1", c: "Comments" }] };
    const runtime = createScreenController({ screen, defs: components, onAction });
    try {
      const step = { address: "c1/r2/like", action: "toggle" } as const;
      expect(runtime.press(step.address).ok).toBe(true);
      expect(runtime.store.get("home/c1/r2/like")).toBe(true);
      expect(runtime.store.get("home/c1/r1/like")).toBeUndefined();
      expect(readComponent(def, input, "c1", "filled", { "c1/r2/like": true }).join("\n")).toContain(
        "[c1/r2/like toggle:on !needs-people]",
      );
      expect(runtime.act(step).ok).toBe(true);
      expect(runtime.store.get("home/c1/r2/like")).toBe(false);
      onAction.mockClear();
      expect(runtime.press("c1/r1/reply").ok).toBe(true);
      expect(runtime.press("c1/r2/more").ok).toBe(true);
      expect(onAction.mock.calls.map(([event]) => event)).toEqual([
        { address: "home/c1/r1/reply", action: "press" },
        { address: "home/c1/r2/more", action: "press" },
      ]);
      for (const part of ["root", "name", "photo", "time", "text", "likes", "like", "like_icon"])
        expect(runtime.act({ address: `c1/r1/${part}`, action: "press" }).ok).toBe(false);
      expect(runtime.confirmation).toBeUndefined();
    } finally {
      runtime.dispose();
    }
  });
});
