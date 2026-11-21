import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import * as catalog from "../../src/catalog";
import { components } from "@lmthing/ui/catalog";
import { draftComponent } from "./draft";

function execute(source: string, require: (id: string) => unknown): unknown {
  const { code } = transformSync(source, { loader: "tsx", format: "cjs" });
  const module: { exports: unknown } = { exports: {} };
  runInNewContext(code, { module, require });
  return module.exports;
}

const definition = (source: string) =>
  execute(source, (id) => (id === "zod" ? { z } : catalog)) as catalog.Definition;

const doc = (file: string) =>
  readFile(new URL(`../../../../docs/catalog/${file}.md`, import.meta.url), "utf8");

function wireSchema(props: z.ZodObject) {
  return z.toJSONSchema(props, { io: "input", unrepresentable: "any" });
}

describe("existing catalog entries", () => {
  it.each([
    [
      "media",
      "Collection",
      ["photo", "title", "by", "about", "summary", "play_icon", "play_label", "follow_icon", "follow_label"],
    ],
    [
      "team",
      "TimeClock",
      ["shift", "status", "since", "elapsed", "elapsed_label", "breaks", "clock_label", "break_label"],
    ],
    ["learning", "Lesson", ["title", "text", "example", "photo", "example_label", "next_label"]],
  ] as const)(
    "matches the documented wire props and action metadata of %s/%s",
    async (pack, name, runtimeParts) => {
      const draft = draftComponent(await doc(`packs/${pack}`), pack, name);
      const { props, meta } = definition(draft.files[draft.view]!);
      const live = components[name];
      // Shared axes and runtime action gates were adopted after these prose entries were written.
      const liveSchema = wireSchema(live.props);
      for (const axis of Object.keys(live.meta.variants)) delete liveSchema.properties?.[axis];
      expect(wireSchema(props)).toEqual(liveSchema);
      expect({
        id: meta.id,
        group: meta.group,
        tier: meta.tier,
        region: meta.region,
        weight: meta.weight,
        states: meta.states,
        actions: meta.actions?.parts,
      }).toEqual({
        id: live.meta.id,
        group: live.meta.group,
        tier: live.meta.tier,
        region: live.meta.region,
        weight: live.meta.weight,
        states: live.meta.states,
        actions: live.meta.actions.parts,
      });
      const runtimeOnly: readonly string[] = runtimeParts;
      expect(meta.parts).toEqual(live.meta.parts.filter((part) => !runtimeOnly.includes(part)));
      expect(draft.files[draft.view]).toContain("// Core first: ");
    },
  );
});

it("accepts the documented digit-leading drivetrain choice in VehicleListing", async () => {
  const draft = draftComponent(await doc("packs/auto"), "auto", "VehicleListing");
  const { props, fallback, meta } = definition(draft.files[draft.view]!);
  const input = fallback({ cast: { things: [], items: [] } }) as Record<string, unknown>;
  expect(props.parse({ ...input, drivetrain: "4wd" })).toMatchObject({ drivetrain: "4wd" });
  expect(props.safeParse({ ...input, drivetrain: 4 }).success).toBe(false);
  expect(meta.partTiers).toEqual({ contact: "service" });
});

it("emits valid child values to test the maximum of a zero-minimum array", async () => {
  const draft = draftComponent(await doc("packs/events"), "events", "RSVP");
  const component = definition(draft.files[draft.view]!);
  const { props, fallback } = component;
  const input = fallback({ cast: { things: [], items: [] } }) as Record<string, unknown>;
  expect(props.parse(input)).toMatchObject({ meals: [] });
  const values: { meals?: string[] }[] = [];
  const collect = Object.assign(() => {}, {
    each: (cases: typeof values) => {
      values.push(...cases);
      return () => {};
    },
  });
  execute(draft.files["src/packs/events/tests/RSVP.test.ts"]!, (id) =>
    id === "vitest" ? { it: collect } : { RSVP: component },
  );
  const meals = values.find((value) => value.meals?.length === 5)?.meals;
  expect(meals).toBeDefined();
  expect(props.safeParse({ ...input, meals: meals!.slice(1) }).success).toBe(true);
  expect(props.safeParse({ ...input, meals }).success).toBe(false);
});

describe("planned catalog entries", () => {
  it("scaffolds the Wave 6 AstroSun entry with exact signed coordinate limits", async () => {
    const draft = draftComponent(await doc("packs/weather"), "weather", "AstroSun");
    const { props, meta, examples, fallback, probes } = definition(draft.files[draft.view]!);
    const valid = { city: "Vancouver", date: "2026-11-21", lat: -90, lon: 180, zone: "America/Vancouver" };
    expect(props.parse(valid)).toEqual({ ...valid, style: "arc" });
    expect(props.safeParse({ ...valid, lat: 90, lon: -180, style: "moon" }).success).toBe(true);
    for (const invalid of [
      { lat: -90.01 },
      { lat: 90.01 },
      { lon: -180.01 },
      { lon: 180.01 },
      { city: "x".repeat(29) },
      { zone: "x".repeat(41) },
      { date: "2026-02-31" },
      { color: "red" },
    ]) {
      expect(props.safeParse({ ...valid, ...invalid }).success).toBe(false);
    }
    expect(props.safeParse({ ...valid, lat: 49.28, lon: -123.12 }).success).toBe(true);
    expect(meta).toMatchObject({
      id: "AstroSun",
      status: "draft",
      group: "data",
      tier: "phone",
      parts: ["root", "style"],
      states: ["filled", "loading"],
      actions: { parts: { style: ["select"] } },
    });
    expect(probes).toEqual([
      expect.objectContaining({ kind: "choose", expect: "AstroSun" }),
      expect.objectContaining({ kind: "choose", expect: "Clocks" }),
      expect.objectContaining({ kind: "write", expect: "AstroSun" }),
      expect.objectContaining({ kind: "read", expect: { address: "c1/style", action: "select" } }),
    ]);
    expect(examples.every((example) => props.safeParse(example).success)).toBe(true);
    expect(
      fallback({ cast: { things: [], items: [{ id: "item", type: "item", name: "Sample", sample: true }] } }),
    ).toMatchObject({ city: "Sample", zone: "Sample" });
    expect(draft.files["src/packs/weather/lang/astro-sun.ts"]).toContain('"loading"');
    expect(draft.files["src/packs/weather/copy/AstroSun.ts"]).toContain("astroSunLabel");
    expect(draft.files["src/packs/weather/tests/AstroSun.test.ts"]).toContain("rejects invalid input");
  });

  it("scaffolds the core FileList with strict row limits and tiered item actions", async () => {
    const draft = draftComponent(await doc("core"), "core", "FileList");
    const { props, meta, probes, fallback } = definition(draft.files[draft.view]!);
    const files = [{ fileRef: "lease", name: "Lease", ext: "pdf", sizeBytes: 0, pages: 1, status: "ready" }];
    expect(props.parse({ files })).toEqual({ files, removable: false, style: "rows" });
    expect(props.safeParse({ files: Array.from({ length: 6 }, () => files[0]) }).success).toBe(true);
    for (const bad of [{ sizeBytes: -1 }, { pages: 1.5 }, { pages: 0 }, { ext: "jpg" }, { color: "red" }])
      expect(props.safeParse({ files: [{ ...files[0], ...bad }] }).success).toBe(false);
    expect(props.safeParse({ files: [] }).success).toBe(false);
    expect(props.safeParse({ files: Array.from({ length: 7 }, () => files[0]) }).success).toBe(false);
    expect(props.safeParse(fallback({ cast: { things: [], items: [] } })).success).toBe(true);
    expect(meta).toMatchObject({
      tier: "ok",
      partTiers: { download: "service" },
      confirmParts: ["remove"],
      items: { key: "files", parts: ["root", "download", "remove"] },
      actions: { items: { root: ["press"], download: ["press"], remove: ["press"] } },
    });
    expect(probes.at(-1)).toMatchObject({ kind: "read", expect: { address: "c1/r1", action: "press" } });
  });
});

it("handles an inline shared axis, explicit defaults and readonly parts", () => {
  const source = [
    "### `Example` · planned · input · phone · body · weight 1",
    "Describe one item.",
    "- Pick: configure an item. Not a gauge (`Ring`).",
    "- Writes: `caption` text(8), `score` int 0–6 (default 3), `times` (12 | 24 | 48, default 24).",
    "- Styles: density: `compact`, `comfortable` (default); kind: `edit`, `review`.",
    "- Parts -> actions: `caption`, `save press`, `save set`. · States: filled, success.",
    "- Real path: editing a local document.",
  ].join("\n");
  const draft = draftComponent(source, "core", "Example");
  const { props, meta } = definition(draft.files[draft.view]!);
  expect(meta.variants).toEqual({ density: ["comfortable", "compact"] });
  expect(meta.actions).toEqual({ parts: { save: ["press", "set"] } });
  expect(meta.parts).toEqual(["root", "caption", "save"]);
  expect(props.parse({ caption: "exactly8" })).toMatchObject({ score: 3, times: 24, kind: "edit" });
  expect(props.safeParse({ caption: "too long!", density: "small" }).success).toBe(false);
  expect(() => draftComponent(source.replace("text(8)", "free-form string"), "core", "Example")).toThrow(
    "Unsupported field `caption`",
  );
});
