import { describe, expect, it } from "vitest";
import { components, createRegistry, packReady, planAct, readScreen } from "@lmthing/ui/catalog";

const def = components.StoryViewer;
const { props, meta, fallback, examples, probes } = def;
const example = examples[0]!;
const slide = example.slides[0]!;

describe("StoryViewer schema", () => {
  it.each(examples)("parses the domain examples", (input) => {
    expect(props.safeParse(input).success).toBe(true);
  });

  it("bounds slides and nested stickers and defaults playback to the first slide", () => {
    expect(
      props.parse({
        author: " Maya ",
        slides: Array(8).fill({
          photo: "local:1",
          time: "x".repeat(12),
          caption: "x".repeat(120),
          sticker: { kind: "poll", label: "x".repeat(40), options: ["x".repeat(20), "Fern"] },
        }),
      }),
    ).toMatchObject({ author: "Maya", current: 0, paused: false, detail: "full", bleed: "edge" });
  });

  it.each([
    { slides: [] },
    { slides: Array(9).fill(slide) },
    { current: 2 },
    { current: -1 },
    { paused: "true" },
    { author: "x".repeat(25) },
    { replyDraft: "x".repeat(121) },
    { style: "clean" },
    { avatar: "https://example.org/avatar.png" },
    { slides: [{ ...slide, sticker: { kind: "poll", label: "Vote", options: ["A", "B", "C"] } }] },
    { slides: [{ ...slide, sticker: { kind: "link", label: "Route", goto: "Bad ID" } }] },
  ])("rejects invalid input: %j", (patch) => {
    expect(props.safeParse({ ...example, ...patch }).success).toBe(false);
  });
});

describe("StoryViewer fallback and sequence", () => {
  it("keeps the pack gate and the core carousel near miss", () => {
    expect(createRegistry({ packs: ["social"], includeDrafts: true }).schema("StoryViewer")).toBe(props);
    expect(createRegistry({ packs: ["social"] }).ids.includes("StoryViewer")).toBe(packReady("social"));
    expect(meta).toMatchObject({ tier: "people", dense: true, weight: 3 });
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Gallery" }));
  });

  it("uses cast copy and neutral fallback copy without inventing an author", () => {
    const empty = { things: [], items: [] };
    const cast = {
      things: [{ type: "entry", fields: ["title", "detail"] }],
      items: [{ id: "one", type: "entry", sample: true, title: "Jordan", detail: "A useful detail" }],
    };
    expect(props.parse(fallback({ cast: empty }))).toMatchObject({ author: "Item one" });
    expect(props.parse(fallback({ cast }))).toMatchObject({
      author: "Jordan",
      slides: [{ caption: "A useful detail" }],
    });
  });

  it("moves forward only within bounds and withholds host controls without adapters", () => {
    const defs = { StoryViewer: def };
    const screen = { id: "home", components: [{ ...example, paused: true, id: "s1", c: meta.id }] };
    const next = { address: "s1/next", action: "press" };
    const first = readScreen(screen, defs);
    expect(first).toContain("Slide 1 of 2");
    expect(first).not.toContain("[s1/prev");
    const advanced = planAct(screen, defs, {}, [next]);
    if (!advanced.ok) throw new Error(advanced.code);
    const second = readScreen(screen, defs, advanced.values);
    expect(second).toContain("Slide 2 of 2");
    expect(second).not.toMatch(/\[s1\/(?:next|sticker|react)\b/);
    expect(planAct(screen, defs, advanced.values, [next])).toMatchObject({ ok: false });
  });
});
