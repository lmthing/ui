// After building the catalog: pnpm --filter @lmthing/ui exec tsx scripts/llm/migration/index.ts
// Make an index, not new samples. Original books are owned by their component and pack tasks.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import type * as Catalog from "@lmthing/ui/catalog";
import { packProbes } from "../pack-probes";
import { compositionHistoryCast } from "../casts";
import { legacyLocalPrompt } from "./legacy-recordings";
import { probeModels } from "../llm.config";
import { matchesRecordedDefinition, recordedAt } from "./recording-history";
import {
  legacyIndexFile,
  recordingKey,
  recordingRoot,
  readLegacyBook,
  evidenceFingerprint,
  keyOf,
  requestHash,
  type LegacyIndex,
  type Book,
  type Evidence,
} from "../recordings";

const {
  archetypes,
  components,
  createRegistry,
  mergePairs,
  packOf,
  packs,
  runComposeProbes,
  runPackProbes,
  runProbes,
} = (await import(new URL("../../../dist/catalog.js", import.meta.url).href)) as typeof Catalog;

async function visitBook(component: string, samples: number, callModel: Catalog.ProbeCall) {
  const registry = createRegistry({ includeDrafts: true });
  const def = (components as Record<string, Catalog.Definition>)[component];
  if (component === "Archetypes")
    await runComposeProbes({
      archetypes: Object.values(archetypes).map(({ meta }) => meta),
      defs: components,
      cast: compositionHistoryCast,
      callModel,
      samples,
      rubric: true,
    });
  else if (component === "CoreMerges")
    for (const pair of mergePairs)
      await runProbes({
        defs: registry.defs.map((def) => ({
          ...def,
          probes: pair.probes.filter((probe) => probe.expect === def.meta.id),
        })),
        only: pair.ids,
        callModel,
      });
  else if (component.startsWith("pack/")) {
    const id = component.slice(5) as Catalog.PackId;
    if (id in packs) await packProbes(id, callModel, 1);
    else await runPackProbes({ packs, only: [id], callModel });
  } else if (component === "variants") await runProbes({ defs: registry.defs, only: [component], callModel });
  else if (def) {
    const pack = (packOf as Record<string, Catalog.PackId | undefined>)[component];
    const defs = pack ? createRegistry({ includeDrafts: true, packs: [pack] }).defs : registry.defs;
    await runProbes({ defs, only: [component], callModel });
  }
}

function indexBook(
  model: string,
  book: Book,
  keys: Record<string, string>,
  hasDefinition: (key: string, component: string, entry: Evidence) => boolean,
): Catalog.ProbeCall {
  const requests = Object.entries(book).filter(([key]) => !key.includes("/"));
  const cached = new Map<string, (typeof requests)[number][]>();
  return async (prompt, sample, format, probe) => {
    const current = recordingKey(model, prompt, format, probe);
    const listing = probe.listing;
    if (!cached.has(current)) {
      const matches = requests.filter(
        ([key, entry]) =>
          JSON.stringify(entry.format) === JSON.stringify(format) &&
          (entry.prompt === prompt ||
            (listing && legacyLocalPrompt(entry.prompt, listing) === probe.localPrompt)) &&
          keyOf(model, entry.prompt, entry.format) === key &&
          (!probe.sourceComponent || hasDefinition(key, probe.sourceComponent, entry)),
      );
      for (const [, entry] of matches)
        keys[recordingKey(model, entry.prompt, format, probe)] = evidenceFingerprint(entry);
      cached.set(current, matches);
    }
    // For the core rubric, replay the exact compose samples so the runner asks about the same screen.
    const exact = cached.get(current)?.find(([, entry]) => entry.prompt === prompt)?.[1];
    return exact?.replies?.[sample] ?? (sample === 0 ? exact?.reply : undefined) ?? "";
  };
}

function saveIndex(index: LegacyIndex) {
  const formatted = `${JSON.stringify(index, null, 2)}\n`;
  try {
    if (readFileSync(legacyIndexFile, "utf8") !== formatted)
      throw new Error("The legacy index is a fixed migration. Refusing to rebind historical evidence.");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    writeFileSync(legacyIndexFile, formatted, { flag: "wx" });
  }
}

const index: LegacyIndex = {};
const hasDefinition = matchesRecordedDefinition(await recordedAt());
let total = 0,
  migrated = 0;
for (const path of readdirSync(recordingRoot, { encoding: "utf8", recursive: true }).sort()) {
  if (!path.endsWith(".json")) continue;
  const separator = path.lastIndexOf("/");
  const component = path.slice(0, separator);
  const model = path.slice(separator + 1, -5);
  const book = readLegacyBook(component, model);
  const keys: Record<string, string> = {};
  await visitBook(
    component,
    probeModels.find(({ id }) => id === model)?.samples ?? 3,
    indexBook(model, book, keys, (key, id, entry) => hasDefinition(`${component}/${model}`, key, id, entry)),
  );
  const aliases = Object.entries(keys).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  if (aliases.length) index[`${component}/${model}`] = Object.fromEntries(aliases);
  total += Object.keys(book).length;
  migrated += new Set(Object.keys(keys).map(requestHash)).size;
}
saveIndex(index);
console.log(`Indexed ${migrated} of ${total} legacy requests. All original replies were kept.`);
