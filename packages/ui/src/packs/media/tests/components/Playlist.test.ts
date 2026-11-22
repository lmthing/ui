import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  emptyLine,
  loadingLabel,
  packReady,
  placeholderTitle,
  readComponent,
  type CastLike,
  type Props,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, elementAt, renderInstance } from "../../../../../test/render";

const def = components.Playlist;
const { props, meta, examples, fallback, probes } = def;
const [tracks, episodes] = [examples[0]!, examples[1]!];
const track = tracks.items[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const prefix = "home/c1/";

describe("Playlist schema", () => {
  it.each(examples)("accepts a domain example", (input) => {
    expect(props.safeParse(input).success).toBe(true);
  });

  it("trims text and preserves the wire limits and defaults", () => {
    const title = "t".repeat(32),
      sub = "s".repeat(36);
    const item = {
      title: ` ${title} `,
      sub,
      goto: "p".repeat(64),
      seconds: 36000,
      played: 1,
      photo: "local:1",
    };
    expect(props.parse({ items: Array.from({ length: 6 }, () => item), playing: 5 })).toMatchObject({
      style: "tracks",
      detail: "full",
      playing: 5,
      items: Array.from({ length: 6 }, () => ({ ...item, title })),
    });
    expectTypeOf<Props<typeof props, typeof meta>["items"][number]["id"]>().toEqualTypeOf<string>();
  });

  // prettier-ignore
  it.each([
    {}, { items: [] }, { items: Array.from({ length: 7 }, () => track) },
    ...[{ playing: -1 }, { playing: 1 }, { playing: 0.5 }, { style: "grid" },
      { detail: "none" }, { surface: "tinted" }, { density: "tiny" }, { color: "red" },
    ].map((patch) => ({ items: [track], ...patch })),
    ...[{ title: "" }, { title: "t".repeat(33) }, { sub: "s".repeat(37) },
      { seconds: 0 }, { seconds: 36001 }, { seconds: 1.1 }, { played: -0.01 }, { played: 1.01 },
      { goto: undefined }, { goto: "not a screen" }, { photo: "https://example.org/cover" }, { id: "r1" },
    ].map((patch) => ({ items: [{ ...track, ...patch }] })),
  ])("rejects invalid wire props: %j", (input) => expect(props.safeParse(input).success).toBe(false));
});

describe("Playlist fallback and metadata", () => {
  it.each([
    { things: [], items: [] },
    { things: [], items: [{ id: "a", type: "recording", title: 4, sample: false }] },
  ])("uses neutral placeholders with no usable cast title", (cast) => {
    const result = fallback({ cast, lang: "en" });
    expect(props.parse(result).items).toEqual([
      { title: placeholderTitle(0, "en"), seconds: 60, played: 0, goto: "player" },
    ]);
  });

  it("uses bounded titles from the cast in order", () => {
    const cast: CastLike = {
      things: [{ type: "recording", fields: ["name"] }],
      items: Array.from({ length: 5 }, (_, n) => ({
        id: `item_${n}`,
        type: "recording",
        sample: false,
        name: `${n}${"t".repeat(50)}`,
      })),
    };
    const result = props.parse(fallback({ cast, lang: "en" }));
    expect(result.items.map(({ title }) => title)).toEqual([0, 1, 2].map((i) => `${i}${"t".repeat(31)}`));
  });

  it("keeps the phone tier, readiness gate and near miss", () => {
    expect(meta).toMatchObject({ status: "ready", weight: 2, tier: "phone" });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta).not.toHaveProperty("confirmParts");
    expect(createRegistry({ packs: ["media"] }).ids.includes(meta.id)).toBe(packReady("media"));
    expect(probes.filter(({ kind }) => kind === "choose").map(({ expect }) => expect)).toEqual([
      "Playlist",
      "List",
    ]);
    expect(probes).toContainEqual(
      expect.objectContaining({
        kind: "write",
        expect: "Playlist",
        variant: expect.objectContaining({ axis: "detail", value: "brief" }),
      }),
    );
    for (const address of ["p1/r2", "p1/r2/trail"])
      expect(probes).toContainEqual(
        expect.objectContaining({ kind: "read", expect: { address, action: "press" } }),
      );
  });
});

describe("Playlist states and parts", () => {
  it("shows either rank, artwork or a current indicator at the same lead address", () => {
    const numbered = renderInstance("Playlist", { ...tracks, playing: undefined }, "filled", theme);
    const playing = renderInstance("Playlist", tracks, "filled", theme);
    const covers = renderInstance("Playlist", episodes, "filled", theme);
    expect(addressedElements(numbered).get(`${prefix}r1/lead`)?.children[0]?.text).toEqual(["1"]);
    expect(elementAt(playing, `${prefix}r1/lead`).children[0]?.tag).toBe("svg");
    expect(playing).toContain('aria-label="Now playing: Choosing a pot" aria-current="true"');
    expect(elementAt(covers, `${prefix}r1/lead`).attributes).toContain('role="img"');
    expect(addressedElements(covers).get(`${prefix}r2/lead`)?.children[0]?.text).toEqual(["2"]);
    expect(addressedElements(playing).get(`${prefix}r1/seconds`)?.text).toEqual(["4:05 · 30% played"]);
    expect(elementAt(playing, `${prefix}r1/played`).children[0]?.attributes).not.toEqual(
      elementAt(playing, `${prefix}r2/played`).children[0]?.attributes,
    );
    expect(addressedElements(covers).get(`${prefix}r1/seconds`)?.text).toEqual(["18:00 · Played"]);
    const row = elementAt(playing, `${prefix}r1/root`);
    expect(JSON.stringify(row.children)).not.toContain(`${prefix}r1/trail`);
  });

  it("renders every supplied part, retains finish addresses and hides only notes in brief", () => {
    const ids = (input: unknown) => [
      ...addressedElements(renderInstance("Playlist", input, "filled", theme)).keys(),
    ];
    const full = ids(episodes);
    expect(full.sort()).toEqual(
      [
        `${prefix}root`,
        ...["r1", "r2"].flatMap((row) => meta.items.parts.map((part) => `${prefix}${row}/${part}`)),
      ].sort(),
    );
    expect(ids({ ...episodes }).sort()).toEqual(full);
    const brief = { ...episodes, detail: "brief" };
    expect(ids(brief).sort()).toEqual(full.filter((id) => !id.endsWith("/sub")));
    expect(readComponent(def, brief, "c1").join("\n")).not.toContain(props.parse(episodes).items[0]!.sub);
  });

  it.each(["empty", "loading"] as const)("draws the inert %s state", (state) => {
    const html = renderInstance("Playlist", tracks, state, theme);
    expect([...addressedElements(html).keys()]).toEqual(
      state === "empty"
        ? [`${prefix}root`, `${prefix}empty`]
        : [`${prefix}root`, `${prefix}r1/played`, `${prefix}r2/played`],
    );
    if (state === "loading") {
      const first = elementAt(html, `${prefix}r1/played`);
      expect(first.attributes).toContain('aria-hidden="true"');
      expect(first.children).toEqual(elementAt(html, `${prefix}r2/played`).children);
    }
    expect(html).toContain(state === "empty" ? emptyLine() : loadingLabel);
    expect(html).not.toMatch(/role="(button|link)"/);
    expect(readComponent(def, tracks, "c1", state)).toEqual([`c1 Playlist (${state})`]);
  });
});

describe("Playlist read and act", () => {
  it("reads localized timing, navigates from the row and dispatches download separately", () => {
    const onAction = vi.fn(),
      onLink = vi.fn();
    const screen = { id: "home", components: [{ ...tracks, id: "c1", c: "Playlist" }] };
    const runtime = createScreenController({ screen, defs: components, onAction, onLink });
    const reading = runtime.read();
    expect(reading).toContain("Now playing: Choosing a pot");
    expect(reading).toContain("When to water · 6:30 · 0% played");
    expect(reading).toContain("[c1/r2/trail press]");
    expect(runtime.press("c1/r2/trail")).toMatchObject({ ok: true });
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: `${prefix}r2/trail`, action: "press" });
    expect(onLink).not.toHaveBeenCalled();
    expect(runtime.press("c1/r2")).toMatchObject({ ok: true });
    expect(onLink).toHaveBeenCalledWith("water_the_fern", `${prefix}r2`);
    for (const part of ["title", "seconds", "played", "lead", "trail_icon"])
      expect(runtime.press(`c1/r2/${part}`)).toMatchObject({ ok: false, code: "not_actionable" });
  });

  it.each(["empty", "loading"] as const)("rejects both row actions during %s", (state) => {
    const screen = { id: "home", components: [{ ...tracks, id: "c1", c: "Playlist", state }] };
    const runtime = createScreenController({ screen, defs: components });
    for (const address of ["c1/r1", "c1/r1/trail"])
      expect(runtime.press(address)).toMatchObject({ ok: false, code: "not_actionable" });
  });
});
