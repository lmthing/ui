import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import {
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readComponent,
  readScreen,
  stampItemIds,
  themeName,
  type Props,
  type ScreenLike,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { createScreenController, KitProvider, PartScope } from "@lmthing/ui/kit";
import { addressedElements, config, elementAt } from "../../../../../test/render";
import { ChapterList } from "../../components";

const def = components.ChapterList;
const { props, meta, examples, fallback, probes } = def;
const sample = examples[0]!;
const chapter = sample.chapters[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const prefix = "home/c1";
const source = { ...sample, c: "ChapterList", id: "c1" };
const player = { c: "Player", id: "p1", title: "Recording", media: "lib:recording", seconds: 112 };
const defs = { ChapterList: def, Player: components.Player };

function renderChapters(input: unknown, lang?: string) {
  const stamped = stampItemIds(meta, props.parse(input)) as Props<typeof props, typeof meta>;
  const context = { screen: "home", component: "c1", rev: 1, state: "filled" } as const;
  const scope = createElement(PartScope, {
    ...context,
    children: createElement(ChapterList.ChapterList, stamped),
  });
  const provider = createElement(KitProvider, { theme, lang, children: scope });
  return renderToStaticMarkup(
    createElement(TamaguiProvider, { config, defaultTheme: themeName(theme) }, provider),
  );
}

describe("ChapterList schema", () => {
  it.each(examples)("accepts a domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it("accepts exact bounds, trims titles and reserves item ids for the view", () => {
    const title = "t".repeat(32);
    const chapters = Array.from({ length: 16 }, (_, i) => ({ title: ` ${title} `, at: i * 2400 }));
    const parsed = props.parse({ chapters, current: 15 });
    expect(parsed).toMatchObject({ current: 15 });
    expect(parsed.chapters).toHaveLength(16);
    expect(parsed.chapters.at(-1)).toEqual({ title, at: 36000 });
    expectTypeOf<Props<typeof props, typeof meta>["chapters"][number]["id"]>().toEqualTypeOf<string>();
  });

  // prettier-ignore
  it.each([
    {}, { chapters: [] }, { chapters: [chapter] },
    { chapters: Array.from({ length: 17 }, (_, at) => ({ ...chapter, at })) },
    ...[{ current: -1 }, { current: 0.5 }, { current: 3 }, { current: 16 },
      { color: "red" }, { density: "tiny" }, { surface: "tinted" }].map((patch) => ({ ...sample, ...patch })),
    ...[{ title: "" }, { title: "t".repeat(33) }, { at: -1 }, { at: 36001 }, { at: 1.1 },
      { id: "r1" }, { goto: "player" }, { at: 48 }, { at: 49 },
    ].map((patch) => ({ chapters: [{ ...chapter, ...patch }, sample.chapters[1]] })),
  ])("rejects invalid input %j", (input) => expect(props.safeParse(input).success).toBe(false));
});

describe("ChapterList fallback and contract", () => {
  it.each([{ items: [] }, { items: [{ id: "a", type: "recording", name: 7, sample: false }] }])(
    "uses two neutral placeholders when no cast titles are usable",
    ({ items }) => {
      const result = props.parse(fallback({ cast: { things: [], items }, lang: "en" }));
      expect(result.chapters).toEqual([0, 1].map((i) => ({ title: placeholderTitle(i, "en"), at: i * 20 })));
    },
  );

  it("uses bounded cast titles and fills the minimum with a neutral title", () => {
    const thing = { type: "recording", fields: ["name"] };
    const item = { id: "a", type: thing.type, name: "x".repeat(50), sample: true };
    const result = props.parse(fallback({ cast: { things: [thing], items: [item] }, lang: "en" }));
    expect(result.chapters).toEqual([
      { title: "x".repeat(32), at: 0 },
      { title: placeholderTitle(1, "en"), at: 20 },
    ]);
  });

  it("preserves the dense phone contract, pack gate and core-first probes", () => {
    expect(meta).toMatchObject({ dense: true, weight: 3, tier: "phone", drives: "Player" });
    expect(meta.states).toEqual(["filled"]);
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta).not.toHaveProperty("confirmParts");
    expect(createRegistry({ packs: ["media"] }).ids.includes(meta.id)).toBe(packReady("media"));
    expect(probes.filter(({ kind }) => kind === "choose").map(({ expect }) => expect)).toEqual([
      "ChapterList",
      "Player",
    ]);
    expect(probes).toContainEqual(expect.objectContaining({ kind: "write", expect: "ChapterList" }));
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "read", screen: 0, expect: { address: "c1/r3", action: "press" } }),
    );
  });
});

describe("ChapterList state and parts", () => {
  it("draws timestamp rails and marks just the current chapter, at stable variant addresses", () => {
    const html = renderChapters(sample);
    const parts = addressedElements(html);
    expect([...parts.keys()].sort()).toEqual(
      [
        `${prefix}/root`,
        ...["r1", "r2", "r3"].flatMap((row) => meta.items.parts.map((part) => `${prefix}/${row}/${part}`)),
      ].sort(),
    );
    expect(parts.get(`${prefix}/r3/at`)?.text).toEqual(["1:52"]);
    expect(parts.get(`${prefix}/r3/title`)?.text).toEqual(["Water it in"]);
    const current = elementAt(html, `${prefix}/r2/root`);
    expect(current.attributes).toContain('aria-current="true"');
    expect(current.attributes).toContain('aria-label="0:48 Loosen the roots · Current chapter"');
    for (const row of ["r1", "r2", "r3"])
      expect(elementAt(html, `${prefix}/${row}/root`).attributes).toContain('role="button"');
    expect(elementAt(html, `${prefix}/r1/root`).attributes).not.toContain("aria-current");
    const variant = { chapters: sample.chapters };
    const noCurrent = renderChapters(variant, "ar-EG");
    expect([...addressedElements(noCurrent).keys()]).toEqual([...parts.keys()]);
    expect(addressedElements(noCurrent).get(`${prefix}/r3/at`)?.text).toEqual(["١:٥٢"]);
    expect(noCurrent).not.toContain('aria-current="true"');
  });

  it("keeps the longest supported timestamp and a full-length title in their parts", () => {
    const title = "t".repeat(32);
    const html = renderChapters({ chapters: [chapter, { at: 36000, title }] });
    const parts = addressedElements(html);
    expect(parts.get(`${prefix}/r1/at`)?.text).toEqual(["0:00"]);
    expect(parts.get(`${prefix}/r2/at`)?.text).toEqual(["10:00:00"]);
    expect(parts.get(`${prefix}/r2/title`)?.text).toEqual([title]);
  });
});

describe("ChapterList read and act", () => {
  it("seeks the same-screen Player at the supplied time without navigating or confirming", () => {
    const screen: ScreenLike = { id: "home", components: [source, player] };
    const seek = vi.fn(),
      onLink = vi.fn();
    const session = { play: vi.fn(), pause: vi.fn(), seek, dispose: vi.fn() };
    const runtime = createScreenController({
      screen,
      defs,
      media: { open: () => session },
      onLink,
      lang: "ar-EG",
    });
    try {
      expect(runtime.read()).toContain("٠:٤٨ Loosen the roots · Current chapter");
      for (const row of ["r1", "r2", "r3"]) expect(runtime.read()).toContain(`[c1/${row} press]`);
      expect(runtime.press(`${prefix}/r3/root`)).toMatchObject({
        ok: true,
        changed: "p1/scrubber seek = 112",
      });
      expect(runtime.store.get("home/p1/scrubber")).toBe(112);
      expect(runtime.press("c1/r1")).toMatchObject({ ok: true });
      expect(seek.mock.calls).toEqual([[112], [0]]);
      expect(onLink).not.toHaveBeenCalled();
      for (const part of ["title", "at"])
        expect(runtime.press(`c1/r3/${part}`)).toMatchObject({ ok: false, code: "not_actionable" });
    } finally {
      runtime.dispose();
    }
  });

  it.each([
    { name: "missing", players: [] },
    { name: "loading", players: [{ ...player, state: "loading" as const }] },
    { name: "shorter than the chapter mark", players: [{ ...player, seconds: 111 }] },
  ])("does not offer or execute a seek when the Player is $name", ({ players }) => {
    const screen = { id: "home", components: [source, ...players] };
    const open = vi.fn();
    const runtime = createScreenController({ screen, defs, media: { open } });
    try {
      expect(readScreen(screen, defs)).not.toContain("[c1/r3 press]");
      expect(runtime.read()).not.toContain("[c1/r3 press]");
      expect(runtime.canPress("c1/r3")).toBe(false);
      expect(runtime.press("c1/r3")).toMatchObject({ ok: false, code: "not_actionable" });
      expect(open).not.toHaveBeenCalled();
    } finally {
      runtime.dispose();
    }
  });

  it("does not advertise seeks in standalone reads without a target", () => {
    const reading = readComponent(def, sample, "c1").join("\n");
    expect(reading).toContain("1:52 Water it in");
    expect(reading).not.toMatch(/\[c1\/r\d+ press\]/);
  });
});
