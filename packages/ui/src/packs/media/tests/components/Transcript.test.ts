import { describe, expect, it, vi } from "vitest";
import {
  clockLine,
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readScreen,
  type CommandRequest,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.Transcript;
const { meta, props, fallback, examples, probes } = def;
const input = examples[0]!;
const transcript = { c: "Transcript", id: "t1", ...input };
const player = { c: "Player", id: "p1", title: "Recording", media: "lib:recording", seconds: 30 };
const defs = { Transcript: def, Player: components.Player };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

describe("Transcript schema", () => {
  it.each(examples)("parses a domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it("accepts 40 ordered lines at the character and playback limits", () => {
    const lines = Array.from({ length: 40 }, (_, i) => ({
      text: "x".repeat(160),
      speaker: "s".repeat(20),
      at: i === 39 ? 36000 : i,
    }));
    expect(props.parse({ lines, current: 39 })).toMatchObject({ follow: true, style: "lyrics", lines });
  });

  it.each([
    { lines: [] },
    { lines: [input.lines[0]] },
    { lines: Array.from({ length: 41 }, (_, at) => ({ at, text: "Line" })) },
    ...[{ current: 3 }, { current: -1 }, { style: "other" }, { color: "red" }].map((patch) => ({
      ...input,
      ...patch,
    })),
    ...[
      { at: -1 },
      { at: 4 },
      { at: 4.1 },
      { at: 36001 },
      { text: "x".repeat(161) },
      { speaker: "s".repeat(21) },
      { id: "r1" },
    ].map((patch) => ({ lines: [{ ...input.lines[0], ...patch }, input.lines[1]] })),
  ])("rejects invalid input %j", (value) => expect(props.safeParse(value).success).toBe(false));
});

describe("Transcript fallback and contract", () => {
  it("uses bounded cast copy and neutral placeholders when there is no usable text", () => {
    const things = [{ type: "recording", fields: ["name"] }];
    for (const items of [[], [{ id: "invalid", type: "recording", sample: true, name: 4 }]]) {
      expect(props.parse(fallback({ cast: { things, items } })).lines.map(({ text }) => text)).toEqual([
        placeholderTitle(0),
        placeholderTitle(1),
      ]);
    }
    const items = [{ id: "sample", type: "recording", sample: true, name: "x".repeat(200) }];
    expect(props.parse(fallback({ cast: { things, items } })).lines[0]?.text).toBe("x".repeat(160));
  });

  it("declares the dense phone contract, the pack gate, and the core-first near miss", () => {
    expect(meta).toMatchObject({ dense: true, weight: 3, tier: "phone" });
    expect(createRegistry({ packs: ["media"] }).ids.includes(meta.id)).toBe(packReady("media"));
    expect(probes.filter(({ kind }) => kind === "choose").map(({ expect }) => expect)).toEqual([
      "Transcript",
      "Article",
    ]);
    expect(probes).toContainEqual(expect.objectContaining({ kind: "write", expect: "Transcript" }));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "read", screen: 0 }));
  });
});

describe("Transcript playback bindings", () => {
  it("observes the Player, seeks by line, and keeps the active reading when follow is turned off", () => {
    const screen = { id: "home", components: [transcript, player] };
    const seek = vi.fn();
    const session = { play: vi.fn(), pause: vi.fn(), seek, dispose: vi.fn() };
    let tick: ((value: number) => void) | undefined;
    const runtime = createScreenController({
      screen,
      defs,
      media: {
        open: (_ref, playback) => {
          tick = playback.onTime;
          return session;
        },
      },
    });
    try {
      expect(runtime.read()).toContain("0:00 Little fern by the window · Current line");
      expect(runtime.press("t1/r3")).toMatchObject({ ok: true, changed: "p1/scrubber seek = 8" });
      expect(runtime.read()).toContain("0:08 Leave a little room to grow · Current line");
      expect(runtime.act({ address: "t1/follow", action: "toggle" }).ok).toBe(true);
      expect(runtime.read()).toContain("Not following playback");
      expect(runtime.press("t1/r2").ok).toBe(true);
      expect(runtime.read()).toContain("0:04 Unroll into the morning light · Current line");
      tick?.(9);
      expect(runtime.read()).toContain("0:08 Leave a little room to grow · Current line");
      tick?.(1);
      expect(runtime.read()).toContain("0:00 Little fern by the window · Current line");
      expect(runtime.act({ address: "t1/follow", action: "toggle" }).ok).toBe(true);
      expect(runtime.read()).toContain("Following playback");
      expect(seek.mock.calls).toEqual([[8], [4]]);
    } finally {
      runtime.dispose();
    }
  });

  it.each([[], [{ ...player, seconds: 7 }], [player, { ...player, id: "p2" }]])(
    "does not offer an unresolvable seek",
    (...players) => {
      const screen = { id: "home", components: [transcript, ...players] };
      expect(readScreen(screen, defs)).not.toContain("[t1/r3 press]");
    },
  );
});

describe("Transcript parts and states", () => {
  it("draws the stamped lines, highlights the current seed and preserves seek parts without timestamps", () => {
    const full = addressedElements(renderInstance("Transcript", input, "filled", theme));
    for (const part of ["root", "title", "lines", "follow", "r1/root", "r1/at", "r1/text", "r1/save"])
      expect(full.has(`home/c1/${part}`)).toBe(true);
    expect(full.get("home/c1/follow")?.attributes).toContain('aria-checked="true"');
    expect(full.get("home/c1/r2/root")?.attributes).toContain('aria-current="true"');
    expect(full.get("home/c1/r3/root")?.attributes).not.toContain("aria-current");
    const brief = addressedElements(
      renderInstance("Transcript", { ...input, detail: "brief" }, "filled", theme),
    );
    expect([...brief.keys()]).toEqual([...full.keys()].filter((part) => !part.endsWith("/at")));
  });

  it("draws named speakers only when provided and keeps follow off in the spoken example", () => {
    const spoken = addressedElements(renderInstance("Transcript", examples[1], "filled", theme));
    expect(spoken.get("home/c1/r1/speaker")?.text).toContain("Maya");
    expect(spoken.has("home/c1/r3/speaker")).toBe(false);
    expect(spoken.get("home/c1/follow")?.attributes).toContain('aria-checked="false"');
  });

  it.each(["empty", "loading"] as const)("draws %s without actionable content", (state) => {
    const html = renderInstance("Transcript", input, state, theme);
    const parts = addressedElements(html);
    const screen = { id: "home", components: [{ ...transcript, state }, player] };
    const reading = readScreen(screen, defs);
    expect(parts.has("home/c1/root")).toBe(true);
    expect(parts.has("home/c1/r1/root")).toBe(false);
    expect(parts.has("home/c1/r1/save")).toBe(false);
    expect(reading).not.toMatch(/\[t1\/.* (?:press|toggle)/);
    if (state === "empty") expect(parts.get("home/c1/empty")?.text).toContain("No transcript available");
    else expect(html).toContain('aria-busy="true"');
  });
});

describe("Saving to Highlights", () => {
  it("does not offer a save without the device handler", () => {
    const runtime = createScreenController({
      screen: { id: "home", components: [transcript, player] },
      defs,
    });
    try {
      expect(runtime.read()).not.toContain("[t1/r1/save press]");
      expect(runtime.press("t1/r1/save").ok).toBe(false);
    } finally {
      runtime.dispose();
    }
  });

  it("saves the addressed line through the device handler without seeking the Player", async () => {
    const highlights: object[] = [];
    const lines = [
      { at: 0, text: "An opening" },
      { at: 5, text: '"'.repeat(160), speaker: "Ada" },
    ];
    const screen = { id: "home", components: [{ ...transcript, lines }, player] };
    const run = vi.fn(({ input }: CommandRequest) => {
      highlights.push({
        text: input.text,
        at: clockLine(Number(input.at)),
        from: player.title,
        goto: screen.id,
      });
      return { status: "accepted" as const };
    });
    const runtime = createScreenController({
      screen,
      defs,
      hostCommands: { commands: { "highlights.saveLine": { allows: () => true, run } } },
    });
    try {
      expect(runtime.read()).toContain("[t1/r2/save press]");
      expect(runtime.press("t1/r2/save").ok).toBe(true);
      expect(run).toHaveBeenCalledWith(
        expect.objectContaining({ input: lines[1], tier: "phone" }),
        expect.anything(),
      );
      await vi.waitFor(() =>
        expect(runtime.hostOperations("t1")).toContainEqual(
          expect.objectContaining({ status: "accepted", row: "r2" }),
        ),
      );
      expect(runtime.read()).toContain("0:00 An opening · Current line");
      expect(components.Highlights.props.parse({ items: highlights }).items).toEqual([
        { text: lines[1]?.text, at: "0:05", from: "Recording", goto: "home" },
      ]);
    } finally {
      runtime.dispose();
    }
  });
});
