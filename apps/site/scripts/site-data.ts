// Everything the pages show, read from the built catalog and the pack docs. Nothing is typed by hand.
import { execSync } from "node:child_process";
import type * as Catalog from "@lmthing/ui/catalog";
import { readPackTable } from "./pack-table";
import { readPlanned, readWaves } from "./plan-docs";
import { readReadProbes, readScreens } from "./recordings";
import type { Accent, Item, ItemState, Pack, Preset, SiteData, Stats } from "./site-types";

const repoRoot = new URL("../../../", import.meta.url).pathname;
const catalog = (await import(
  new URL("packages/ui/dist/catalog.js", `file://${repoRoot}`).href
)) as typeof Catalog;
const maxLine = 700;

type DefLike = { meta: Record<string, unknown> & { id: string; group: string }; examples?: unknown[] };

function lineOf(def: DefLike): string {
  const first = def.examples?.[0];
  if (!first) return "";
  const text = JSON.stringify({ id: "x1", c: def.meta.id, ...(first as object) });
  return text.length <= maxLine ? text : "";
}

function toItem(def: DefLike, pack: string | null, packReady: boolean): Item {
  const meta = def.meta as Record<string, string | undefined> & { id: string; group: string };
  const built = (meta.status ?? "ready") === "ready";
  const state: ItemState = !built ? "draft" : pack && !packReady ? "pack in progress" : "ready";
  return {
    id: meta.id,
    group: meta.group,
    tier: meta.tier ?? "phone",
    purpose: meta.purpose ?? "",
    pick: meta.pick ?? "",
    pack,
    state,
    line: lineOf(def),
  };
}

function git(args: string, fallback: string): string {
  try {
    return execSync(`git ${args}`, { cwd: repoRoot, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return fallback;
  }
}

function buildStats(items: Item[], packs: Pack[], core: Item[]): Stats {
  const byGroup = new Map<string, number>();
  for (const item of core) byGroup.set(item.group, (byGroup.get(item.group) ?? 0) + 1);
  const planned = packs.reduce((sum, pack) => sum + pack.plannedComponents, 0);
  return {
    core: core.length,
    coreByGroup: [...byGroup].sort((a, b) => b[1] - a[1]),
    built: items.length,
    shipped: items.filter((item) => item.state === "ready").length,
    drafts: items.filter((item) => item.state === "draft").length,
    plannedTotal: core.length + planned,
    packsReady: packs.filter((pack) => pack.ready).length,
    packsInProgress: packs.filter((pack) => !pack.ready && pack.items.length > 0).length,
    packsPlanned: packs.filter((pack) => !pack.ready && pack.items.length === 0).length,
    archetypes: Object.keys(catalog.archetypes).length,
    presetsBuilt: catalog.presets.length,
    accentsBuilt: catalog.accents.length,
    themesBuilt: catalog.presets.length * catalog.accents.length * 2,
  };
}

export function loadSiteData(): SiteData {
  const registry = catalog.createRegistry({ includeDrafts: true, packs: catalog.packIds });
  const table = readPackTable(`${repoRoot}docs/catalog/packs/README.md`);
  const readyPacks = new Set<string>(catalog.packIds.filter(packIsReady));
  const defs = registry.defs as unknown as DefLike[];
  const packOf = registry.packOf as Record<string, string | undefined>;
  const items = defs.map((def) =>
    toItem(def, packOf[def.meta.id] ?? null, readyPacks.has(packOf[def.meta.id] ?? "")),
  );
  const waves = readWaves(`${repoRoot}docs/catalog/packs/build-plan.md`);
  const waveOf = (id: string) => waves.find((w) => w.packs.includes(id))?.wave ?? 0;
  const packs: Pack[] = catalog.packIds.map((id) => ({
    id,
    ready: readyPacks.has(id),
    pick: table[id]?.pick ?? "",
    example: (catalog.packs as Record<string, { example?: string } | undefined>)[id]?.example ?? "",
    plannedComponents: table[id]?.components ?? 0,
    plannedArchetypes: table[id]?.archetypes ?? 0,
    items: items.filter((item) => item.pack === id),
    planned: readPlanned(`${repoRoot}docs/catalog/packs/${id}.md`),
    wave: waveOf(id),
    lines: ((catalog.packExamples as Record<string, string | undefined>)[id] ?? "")
      .split("\n")
      .filter((l: string) => l.trim()),
  }));
  const core = items.filter((item) => !item.pack);
  const presets = catalog.presets.map((p) => ({ ...p, roles: p.roles })) as unknown as Preset[];
  const accents = catalog.accents.map((a) => ({
    id: a.id,
    roles: { light: a.light, dark: a.dark },
  })) as Accent[];
  const recordings = `${repoRoot}packages/ui/test/recordings`;
  return {
    repo: process.env.GITHUB_REPOSITORY ?? "lmthing/ui",
    commit: process.env.GITHUB_SHA?.slice(0, 7) ?? git("rev-parse --short HEAD", "dev"),
    built: new Date().toISOString().slice(0, 10),
    items,
    packs,
    presets,
    accents,
    stats: buildStats(items, packs, core),
    waves: waves.map(({ wave, why, packs: ids }) => ({ wave, why, packs: ids })),
    screens: readScreens(recordings),
    readProbes: readReadProbes(recordings),
    themeVars: themeVars(),
  };
}

/** A pack is ready when the registry, which leaves out unfinished packs, still loads its components. */
function packIsReady(id: Catalog.PackId): boolean {
  const registry = catalog.createRegistry({ packs: [id] });
  const packOf = registry.packOf as Record<string, string | undefined>;
  return registry.defs.some((def) => packOf[def.meta.id] === id);
}

/** Every colour role of every built theme, keyed `<preset>_<accent>_<mode>`, for the page's CSS variables. */
function themeVars(): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const preset of catalog.presets) {
    for (const accent of catalog.accents) {
      for (const mode of ["light", "dark"] as const) {
        out[`${preset.id}_${accent.id}_${mode}`] = catalog.themeRoles(
          preset,
          accent,
          mode,
        ) as unknown as Record<string, string>;
      }
    }
  }
  return out;
}
