import { describe, expect, it, vi } from "vitest";
import { components, createRegistry, packReady, placeholderTitle, readScreen } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";

const def = components.Transcript;
const { meta, props, fallback, examples, probes } = def;
const input = examples[0]!;
const transcript = { c: "Transcript", id: "t1", ...input };
const player = { c: "Player", id: "p1", title: "Recording", media: "lib:recording", seconds: 30 };
const defs = { Transcript: def, Player: components.Player };

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
    const runtime = createScreenController({ screen, defs, media: { open: () => session } });
    try {
      expect(runtime.read()).toContain("0:00 Little fern by the window · Current line");
      expect(runtime.press("t1/r3")).toMatchObject({ ok: true, changed: "p1/scrubber seek = 8" });
      expect(runtime.read()).toContain("0:08 Leave a little room to grow · Current line");
      expect(runtime.act({ address: "t1/follow", action: "toggle" }).ok).toBe(true);
      expect(runtime.read()).toContain("Not following playback");
      expect(runtime.press("t1/r2").ok).toBe(true);
      expect(runtime.read()).toContain("0:04 Unroll into the morning light · Current line");
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
