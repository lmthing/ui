import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  packs,
  placeholderTitle,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, elementAt, renderInstance, styleAt } from "../../../../../test/render";

const { props, meta, examples, fallback, probes } = components.MiniPlayer;
const [playing, paused] = [examples[0]!, examples[1]!];
const theme = { preset: "calm", accent: "moss", mode: "light" } as const;
const prefix = "home/c1/";

describe("MiniPlayer schema and boundaries", () => {
  it.each(examples)("accepts a domain example", (input) => {
    expect(props.safeParse(input).success).toBe(true);
  });

  it("trims title and accepts the exact upper and lower limits", () => {
    const title = "t".repeat(40);
    expect(props.parse({ ...playing, title: ` ${title} `, at: 36000, seconds: 36000 })).toMatchObject({
      title,
      at: 36000,
      seconds: 36000,
    });
    expect(
      props.safeParse({ ...playing, photo: "local:1", goto: "p".repeat(64), at: 0, seconds: 1 }).success,
    ).toBe(true);
    expectTypeOf<Props<typeof props, typeof meta>["playing"]>().toEqualTypeOf<boolean>();
  });

  // prettier-ignore
  it.each([
    { title: "" }, { title: "t".repeat(41) }, { photo: "https://example.org/cover" },
    { photo: undefined }, { goto: undefined }, { goto: "not a screen" },
    { at: -1 }, { at: 1.5 }, { at: 481 }, { at: 36001, seconds: 36000 },
    { seconds: 0 }, { seconds: 36001 }, { seconds: 45.5 }, { playing: "true" },
    { surface: "raised" }, { density: "tiny" }, { color: "red" },
  ])("rejects invalid props: %j", (patch) => {
    expect(props.safeParse({ ...playing, ...patch }).success).toBe(false);
  });
});

describe("MiniPlayer fallback and metadata", () => {
  it.each([
    { things: [], items: [] },
    { things: [], items: [{ id: "a", type: "recording", title: 4, sample: false }] },
  ])("picks neutral copy and artwork without usable cast data", (cast) => {
    expect(props.parse(fallback({ cast, lang: "en" }))).toMatchObject({
      title: placeholderTitle(0, "en"),
      photo: "lib:item",
      at: 0,
      seconds: 60,
      playing: false,
      goto: "player",
    });
  });

  it("picks the first cast title and artwork", () => {
    const cast: CastLike = {
      things: [{ type: "recording", fields: ["name"] }],
      items: [{ id: "first", type: "recording", name: "t".repeat(50), sample: true }],
    };
    expect(props.parse(fallback({ cast }))).toMatchObject({
      title: "t".repeat(40),
      photo: "lib:recording",
    });
  });

  it("has a phone tier and remains host-owned, with a pack near miss for a single recording", () => {
    expect(meta).toMatchObject({
      status: "ready",
      codeOwned: true,
      region: "bottom",
      weight: 1,
      tier: "phone",
    });
    expect(meta.realPath).not.toBe("");
    expect(meta).not.toHaveProperty("confirmParts");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(createRegistry({ packs: ["media"] }).ids.includes(meta.id)).toBe(packReady("media"));
    expect(packs.media.probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Player" }));
    expect(probes.map(({ kind, expect }) => [kind, expect])).toEqual([
      ["read", { address: "m1/play", action: "pause" }],
      ["read", { address: "m1", action: "press" }],
      ["read", { address: "m1/play", action: "play" }],
    ]);
  });
});

describe("MiniPlayer states and parts", () => {
  it("draws the filled state and retains all addresses across finish variants", () => {
    expect(meta.states).toEqual(["filled"]);
    for (const input of [playing, paused, { ...playing }]) {
      const html = renderInstance("MiniPlayer", input, "filled", theme);
      expect([...addressedElements(html).keys()].sort()).toEqual(
        meta.parts.map((part) => `${prefix}${part}`).sort(),
      );
      const root = elementAt(html, `${prefix}root`);
      expect(root.attributes).toContain('role="link"');
      expect(JSON.stringify(root.children)).not.toContain(`${prefix}play`);
      expect(elementAt(html, `${prefix}play`).attributes).toContain('role="button"');
      expect(elementAt(html, `${prefix}photo`).attributes).toContain('role="img"');
      expect(addressedElements(html).get(`${prefix}title`)?.text).toEqual([input.title]);
    }
  });

  it.each([0, 45, 480])("draws the correct progress fraction at %i seconds", (at) => {
    const html = renderInstance("MiniPlayer", { ...playing, at }, "filled", theme);
    const track = elementAt(html, `${prefix}progress`);
    expect(track.attributes).toContain('aria-hidden="true"');
    expect(styleAt(html, track.children[0]!)).toContain(`width:${(at / playing.seconds) * 100}%`);
  });

  it.each([
    [playing, "Pause", "0:45 · 7:15 left"],
    [paused, "Play", "0:12 · 4:23 left"],
  ] as const)("labels the transport control and shows elapsed and remaining time", (input, label, time) => {
    const html = renderInstance("MiniPlayer", input, "filled", theme);
    expect(elementAt(html, `${prefix}play`).attributes).toContain(`aria-label="${label}"`);
    expect(addressedElements(html).get(`${prefix}time`)?.text).toEqual([time]);
  });
});

describe("MiniPlayer read and act", () => {
  it.each([
    [playing, "pause", "play", "Playing — 0:45 · 7:15 left"],
    [paused, "play", "pause", "Paused — 0:12 · 4:23 left"],
  ] as const)(
    "offers only the correct playback action, separate from navigation",
    (input, action, other, timing) => {
      const onAction = vi.fn(),
        onLink = vi.fn();
      const screen = { id: "home", components: [{ ...input, id: "c1", c: "MiniPlayer" }] };
      const runtime = createScreenController({ screen, defs: components, onAction, onLink });
      expect(runtime.read()).toContain(timing);
      expect(runtime.read()).toContain(`[c1/play ${action}]`);
      expect(runtime.read()).not.toContain(`[c1/play ${other}]`);
      expect(runtime.actionsAt("c1/play")).toEqual([action]);
      expect(runtime.act({ address: "c1/play", action: other })).toMatchObject({ ok: false });
      expect(onAction).not.toHaveBeenCalled();
      expect(runtime.act({ address: "c1/play", action })).toMatchObject({ ok: true });
      expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: `${prefix}play`, action });
      expect(onLink).not.toHaveBeenCalled();
      expect(runtime.press("c1")).toMatchObject({ ok: true });
      expect(onLink).toHaveBeenCalledExactlyOnceWith(input.goto, "home/c1");
      expect(onAction).toHaveBeenLastCalledWith({ address: "home/c1", action: "press" });
      for (const part of ["photo", "title", "progress", "time", "play_icon"])
        expect(runtime.press(`c1/${part}`)).toMatchObject({ ok: false, code: "not_actionable" });
    },
  );
});
