import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { expect, it } from "vitest";
import {
  archetypes,
  checkArchetypes,
  components,
  createRegistry,
  packArchetypes,
  packComposeProbes,
  packExamples,
  packOf,
  packReady,
  placeholderTitle,
  scoreComposition,
  writerFormat,
  type CastLike,
  type Definition,
} from "@lmthing/ui/catalog";

const workedExampleIds = ["Library", "Collection", "Playlist", "ChapterList", "Highlights"];
const ids = [...workedExampleIds, "MiniPlayer", "Transcript", "AudioMatch"];
const core = createRegistry();
const scoped = createRegistry({ packs: ["media"], includeDrafts: true });
const defs: Record<string, Definition> = components;
const cast: CastLike = { things: [], items: [] };
const populatedCast: CastLike = {
  things: [{ type: "recording", fields: ["name", "summary"] }],
  items: [
    {
      id: "recording_1",
      type: "recording",
      sample: true,
      name: "Morning reading",
      summary: "An introduction",
    },
  ],
};
const malformedCast: CastLike = {
  things: [{ type: "recording", fields: ["name", "summary"] }],
  items: [{ id: "recording_1", type: "recording", sample: true, name: 7, summary: " " }],
};
const recipes = {
  "library/covers": ["Header", "Segmented", "Library"],
  "library/home": ["Header", "Stats", "SectionTitle", "List", "SectionTitle", "List"],
  "collection/episodes": ["Header", "Collection", "Playlist"],
  "reader/article": ["Header", "Article", "SectionTitle", "List"],
  "reader/listen": ["Header", "Player", "ChapterList"],
  "reader/transcript": ["Header", "Player", "Transcript"],
  "reader/identify": ["Header", "AudioMatch", "Note"],
  "reader/highlights": ["Header", "Search", "Highlights"],
};

it("offers Media when selected and ready, with MiniPlayer kept out of the Writer", () => {
  expect(createRegistry().resolve("Article")).toBe("Article");
  expect(Object.hasOwn(packOf, "Article")).toBe(false);
  const live = createRegistry({ packs: ["media"] });
  const ready = ids.every((id) => defs[id]?.meta.status === "ready");
  expect(packReady("media")).toBe(ready);
  const owned = Object.entries(packOf)
    .filter(([, owner]) => owner === "media")
    .map(([id]) => id);
  expect(owned.sort()).toEqual([...ids].sort());
  expect(scoped.ids.filter((id) => !core.ids.includes(id)).sort()).toEqual([...ids].sort());
  expect(live.ids).toEqual(ready ? scoped.ids : core.ids);
  const draftFormat = JSON.stringify(writerFormat(scoped));
  const liveFormat = JSON.stringify(writerFormat(live));
  for (const id of ids) {
    expect(core.ids).not.toContain(id);
    expect(draftFormat.includes(`"const":"${id}"`)).toBe(id !== "MiniPlayer");
    expect(liveFormat.includes(`"const":"${id}"`)).toBe(ready && id !== "MiniPlayer");
  }
  for (const id of ["library", "collection", "reader"]) {
    expect(Object.hasOwn(core.archetypes, id)).toBe(false);
    expect(Object.hasOwn(scoped.archetypes, id)).toBe(true);
    expect(Object.hasOwn(live.archetypes, id)).toBe(ready);
  }
});

it("has valid examples and neutral fallbacks for the pack definitions", () => {
  for (const id of ids) {
    const def = defs[id]!;
    expect(def.examples.length, id).toBeGreaterThanOrEqual(2);
    for (const input of def.examples) expect(def.props.safeParse(input).success, id).toBe(true);
    for (const sample of [cast, populatedCast, malformedCast]) {
      const result = def.fallback({ cast: sample });
      expect(def.props.safeParse(result).success, id).toBe(true);
      if (id === "AudioMatch") expect(result).toEqual({ history: [] });
      else
        expect(JSON.stringify(result), id).toContain(
          JSON.stringify(sample === populatedCast ? "Morning reading" : placeholderTitle(0)),
        );
    }
    const kinds = def.probes.map((probe) => probe.kind);
    expect(kinds, id).toContain("read");
    if (!def.meta.codeOwned) {
      const choices = def.probes.flatMap((probe) => (probe.kind === "choose" ? [probe.expect] : []));
      const writes = def.probes.flatMap((probe) => (probe.kind === "write" ? [probe.expect] : []));
      expect(choices, id).toContain(id);
      expect(writes, id).toContain(id);
      expect(
        core.ids.some((coreId) => choices.includes(coreId)),
        id,
      ).toBe(true);
    } else expect(new Set(kinds), id).toEqual(new Set(["read"]));
    for (const part of [...(def.meta.parts ?? []), ...(def.meta.items?.parts ?? [])])
      expect(part, id).toMatch(/^[a-z][a-z0-9_]*$/);
  }
});

it("enforces the strict schemas and playback bounds", () => {
  const invalid = {
    Article: [
      { title: "Essay", body: "x".repeat(2001) },
      { title: "Essay", body: "Text", links: [] },
    ],
    Library: [
      { items: [] },
      { items: [{ title: "Essay", photo: "lib:essay", goto: "essay", progress: 1.1 }] },
    ],
    Collection: [{ ...components.Collection.examples[0], count: 3 }],
    Playlist: [{ ...components.Playlist.examples[0], playing: 2 }],
    ChapterList: [
      { chapters: [{ title: "Intro", at: 0 }] },
      {
        chapters: [
          { title: "Intro", at: 0 },
          { title: "Later", at: 0 },
        ],
      },
      { ...components.ChapterList.examples[0], current: 3 },
    ],
    MiniPlayer: [{ ...components.MiniPlayer.examples[0], at: 500 }],
    Highlights: [{ items: [{ text: "x".repeat(241), from: "A show", goto: "show" }] }],
  };
  for (const [id, inputs] of Object.entries(invalid))
    for (const input of inputs) expect(defs[id]!.props.safeParse(input).success, id).toBe(false);
});

it("exposes only supported screen links as addressed Article rows", () => {
  const parsed = components.Article.props.parse({
    title: "Guide",
    body: "Open [first](screen:first), ignore [external](https://example.org) and ![image](screen:image), then [second](screen:second).",
  });
  expect(parsed).toMatchObject({
    links: [
      { title: "first", goto: "first" },
      { title: "second", goto: "second" },
    ],
  });
});

it("validates the exact recipe order and neutral defaults for the compose layouts", () => {
  expect(checkArchetypes({ components, packOf, packArchetypes, archetypes })).toEqual([]);
  expect(packComposeProbes.media.map(({ archetype, layout }) => `${archetype}/${layout}`).sort()).toEqual(
    Object.keys(recipes).sort(),
  );
  for (const [path, order] of Object.entries(recipes)) {
    const [archetype, layout] = path.split("/") as [string, string];
    const screen = scoped.defaultLines(archetype, layout, cast);
    expect(
      screen.components.map(({ c }) => c),
      path,
    ).toEqual(order);
    expect(
      scoreComposition(JSON.stringify(screen), scoped.archetypes[archetype]!.meta, layout, defs).issues,
      path,
    ).toEqual([]);
  }
});

it("preserves cast titles and fills missing cover rows in shelf defaults", () => {
  for (const [archetype, layout] of [
    ["library", "home"],
    ["reader", "article"],
  ] as const) {
    const screen = scoped.defaultLines(archetype, layout, populatedCast);
    for (const { c, id: _id, ...line } of screen.components.filter(({ c }) => c === "List")) {
      expect(components.List.props.parse(line)).toMatchObject({
        style: "shelf",
        rows: [{ title: "Morning reading", photo: "lib:recording" }, { title: placeholderTitle(1) }],
      });
    }
  }
});

it("validates every Pew line with the real registry, one count-up signature and no host-owned lines", () => {
  const source = readFileSync(new URL("../example.jsonl", import.meta.url), "utf8");
  expect(packExamples.media).toBe(source);
  const lines = source
    .trimEnd()
    .split("\n")
    .map((line) => JSON.parse(line));
  expect(new Set(lines.map(({ id }) => id)).size).toBe(lines.length);
  for (const { c, id, ...props } of lines)
    expect(scoped.schema(c)?.safeParse(props).success, `${id}/${c}`).toBe(true);
  expect(lines.map(({ c }) => c)).toEqual(expect.arrayContaining(["Article", ...workedExampleIds]));
  expect(lines.some(({ c }) => defs[c]?.meta.codeOwned)).toBe(false);
  expect(lines.flatMap(({ c }) => defs[c]?.meta.signature ?? [])).toEqual(["count_up"]);
});
