import { describe, expect, it, vi } from "vitest";
import { components, createRegistry, packReady, planAct, readScreen } from "@lmthing/ui/catalog";
import { createScreenController, type HostCommandResult } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

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
    { slides: [{ ...slide, time: "x".repeat(13) }] },
    { slides: [{ ...slide, caption: "x".repeat(121) }] },
    { current: 2 },
    { current: -1 },
    { paused: "true" },
    { author: "x".repeat(25) },
    { replyDraft: "x".repeat(121) },
    { style: "clean" },
    { color: "red" },
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
    expect(
      props.parse(fallback({ cast: { ...cast, items: [{ ...cast.items[0]!, title: 42, detail: 42 }] } })),
    ).toMatchObject({ author: "Item one" });
  });

  it("moves forward only within bounds and withholds host controls without adapters", () => {
    const defs = { StoryViewer: def };
    const screen = { id: "home", components: [{ ...example, paused: true, id: "s1", c: meta.id }] };
    const next = { address: "s1/next", action: "press" };
    const first = readScreen(screen, defs);
    expect(first).toContain("Slide 1 of 2");
    expect(first).not.toMatch(/\[s1\/prev|The next batch is ready/);
    const advanced = planAct(screen, defs, {}, [next]);
    if (!advanced.ok) throw new Error(advanced.code);
    const second = readScreen(screen, defs, advanced.values);
    expect(second).toContain("Slide 2 of 2");
    expect(second).not.toMatch(/New fronds|Which cutting next/);
    expect(second).not.toMatch(/\[s1\/(?:next|sticker|react)\b/);
    expect(planAct(screen, defs, advanced.values, [next])).toMatchObject({ ok: false });
  });
});

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const key = (part: string) => `home/s1/${part}`;
const drawn = (input: unknown, state: "filled" | "empty" | "loading" | "success" = "filled") =>
  addressedElements(renderInstance("StoryViewer", input, state, theme, { component: "s1" }));

it("draws the current slide and hides only the reply dock for brief detail", () => {
  const full = drawn(example);
  expect(full.get(key("author"))?.text).toEqual(["Maya"]);
  expect(full.get(key("position"))?.text).toEqual(["Slide 1 of 2"]);
  expect(full.get(key("time"))?.text).toEqual(["4 min ago"]);
  expect(full.get(key("sticker"))?.attributes).toContain('aria-label="Which cutting next?"');
  expect(full.get(key("reply"))?.attributes).toContain('role="textbox"');
  expect(full.get(key("send"))?.attributes).toContain('role="button"');
  expect(drawn({ ...example, current: 1 }).has(key("sticker"))).toBe(false);
  expect([...drawn({ ...example, aspect: "square", bleed: "inset" }).keys()]).toEqual([...full.keys()]);
  expect([...drawn({ ...example, detail: "brief" }).keys()]).toEqual(
    [...full.keys()].filter((part) => !/\/(?:reply|send|react)$/.test(part)),
  );
});

it("draws specific empty, loading and success states with one close action", () => {
  for (const [state, message] of [
    ["empty", "This story is no longer available."],
    ["success", "Reply sent."],
  ] as const) {
    const parts = drawn(example, state);
    expect(parts.get(key("status"))?.text).toEqual([message]);
    expect(parts.has(key("photo"))).toBe(false);
    expect(parts.has(key("close"))).toBe(true);
  }
  const loading = drawn(example, "loading");
  expect(loading.get(key("photo"))?.attributes).toContain('aria-hidden="true"');
  expect(loading.get(key("reply"))?.attributes).not.toContain('role="textbox"');
  expect(loading.has(key("close"))).toBe(true);
});

function storyController(input: unknown) {
  const run = vi.fn((): HostCommandResult => ({ status: "accepted" }));
  const commands = Object.fromEntries(
    ["story.sticker", "story.reply", "story.react"].map((name) => [name, { allows: () => true, run }]),
  );
  const screen = { id: "home", components: [{ ...(input as object), id: "s1", c: meta.id }] };
  const controller = createScreenController({
    screen,
    defs: { StoryViewer: def },
    hostCommands: { commands },
  });
  for (const part of ["prev", "next", "story", "sticker", "reply", "send", "react", "close"])
    controller.registerPart(`s1/${part}`);
  return { controller, run };
}

it("advances on the shared clock, pauses between slides, and closes the viewer", () => {
  vi.useFakeTimers();
  const { controller } = storyController(example);
  try {
    controller.mount();
    expect(controller.actionsAt("s1/story")).toEqual(["pause"]);
    vi.advanceTimersByTime(2000);
    expect(controller.act({ address: "s1/story", action: "pause" }).ok).toBe(true);
    vi.advanceTimersByTime(10000);
    expect(controller.read()).toContain("Slide 1 of 2");
    expect(controller.act({ address: "s1/story", action: "play" }).ok).toBe(true);
    vi.advanceTimersByTime(3000);
    expect(controller.read()).toContain("Slide 2 of 2");
    expect(controller.actionsAt("s1/next")).toEqual([]);
    vi.advanceTimersByTime(5000);
    expect(controller.actionsAt("s1/story")).toEqual(["play"]);
    expect(controller.act({ address: "s1/close", action: "dismiss" }).ok).toBe(true);
    expect(controller.read()).not.toContain("StoryViewer");
  } finally {
    controller.dispose();
    vi.useRealTimers();
  }
});

it("offers host actions on the current slide and sends only a bounded nonempty draft", async () => {
  const { controller, run } = storyController({ ...example, paused: true });
  try {
    expect(controller.actionsAt("s1/send")).toEqual([]);
    expect(controller.press("s1/sticker").ok).toBe(true);
    expect(run).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: "story.sticker", input: { slide: 0, kind: "poll" } }),
      expect.anything(),
    );
    await Promise.resolve();
    expect(controller.press("s1/next").ok).toBe(true);
    expect(controller.actionsAt("s1/sticker")).toEqual([]);
    expect(controller.act({ address: "s1/reply", action: "type", value: "x".repeat(121) }).ok).toBe(false);
    expect(controller.act({ address: "s1/reply", action: "type", value: "  Sounds good!  " }).ok).toBe(true);
    expect(controller.act({ address: "s1/send", action: "send" }).ok).toBe(true);
    expect(run).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: "story.reply", input: { slide: 1, text: "Sounds good!" } }),
      expect.anything(),
    );
    await Promise.resolve();
    expect(controller.press("s1/react").ok).toBe(true);
    expect(run).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: "story.react", input: { slide: 1 } }),
      expect.anything(),
    );
  } finally {
    controller.dispose();
  }
});
