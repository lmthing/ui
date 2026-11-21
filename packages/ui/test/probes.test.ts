// Replays the recorded model replies: every component's probes must pass on every required model.
// A missing recording fails with the command to run (pnpm llm:check --component <Id>).
import { describe, expect, it } from "vitest";
import {
  createRegistry,
  runProbes,
  runPackProbes,
  packs,
  packComposeProbes,
  packOf,
  runComposeProbes,
  variantAxes,
  type PackId,
  type PackMeta,
  type ComposeProbe,
} from "@lmthing/ui/catalog";

import { existsSync } from "node:fs";
import { probeModels, replayCall } from "../scripts";
import { componentFilter, selectedIds, selectedLayouts, wholePack } from "../scripts/build";

const known = (id: string) => existsSync(`${import.meta.dirname}/known/${id}.md`);

const registry = createRegistry({ includeDrafts: true });
const required = probeModels.filter((model) => model.required);
const suite = import.meta.url;
const filter = componentFilter(suite);
const packMembers = packOf as Record<string, PackId>;
const packMeta = packs as Partial<Record<PackId, PackMeta>>;
const ids = Object.keys(packs) as PackId[];
const selectedPacks = ids.filter(
  (id) => wholePack(id, suite) || filter?.some((name) => packMembers[name] === id),
);
const compositionPacks = ids.filter((id) => {
  if (selectedPacks.includes(id)) return true;
  if (packMeta[id]?.probes.some((probe) => probe.kind === "choose" && filter?.includes(probe.expect)))
    return true;
  const { packComposeArchetypes } = createRegistry({ packs: [id], includeDrafts: true });
  return Boolean(selectedLayouts(packComposeArchetypes, suite)?.length);
});

describe.each(required)("shared variant probes on $id", (model) => {
  it.runIf(selectedIds(["variants", ...registry.ids], suite).length > 0)(
    "replays every requested and plain brief with a passing majority",
    async () => {
      const results = await runProbes({
        defs: registry.defs,
        only: ["variants"],
        samples: model.samples,
        callModel: replayCall("variants", model.id),
      });
      expect(results).toHaveLength(Object.keys(variantAxes).length * 2);
      expect(
        results.filter(({ status }) => status !== "pass").map(({ probe, detail }) => ({ probe, detail })),
      ).toEqual([]);
    },
  );
});

describe.each(required)("probes on $id", (model) => {
  it.each(selectedIds(registry.ids, suite))("%s passes its probes", async (id) => {
    if (known(id)) return; // open problem in test/known/<Id>.md: llm:check shows it, the fixer clears it
    const results = await runProbes({
      defs: registry.defs,
      callModel: replayCall(id, model.id),
      only: [id],
      samples: model.samples,
    });
    const failures = results.filter((result) => result.status === "fail");
    expect(failures.map((f) => `${f.probe.kind}: ${f.detail}`)).toEqual([]);
    expect(results.some((result) => result.status === "pass")).toBe(true);
  });
});

describe.each(required)("pack probes on $id", (model) => {
  it.runIf(selectedPacks.length > 0)("replays every pack probe with a passing majority", async () => {
    const results = [];
    for (const id of selectedPacks)
      results.push(
        ...(await runPackProbes({
          packs,
          only: [id],
          samples: model.samples,
          callModel: replayCall(`pack/${id}`, model.id),
        })),
      );
    if (!results.length) return;
    expect(
      results
        .filter((result) => result.status !== "pass")
        .map((result) => `${result.component}: ${result.detail}`),
    ).toEqual([]);
  });
});

describe.each(required)("pack component and composition probes on $id", (model) => {
  it.each(compositionPacks)("%s passes every component and every layout", async (id) => {
    const registry = createRegistry({ packs: [id], includeDrafts: true });
    const callModel = replayCall(`pack/${id}`, model.id);
    const all = wholePack(id, suite);
    const members = registry.ids.filter((name) => packMembers[name] === id);
    const only = all ? members : selectedIds(members, suite);
    const core = packMeta[id]!.probes.filter((probe) => probe.kind === "choose");
    const coreResults = await runProbes({
      defs: registry.defs.map((def) => ({
        ...def,
        probes: core.filter((probe) => probe.expect === def.meta.id),
      })),
      callModel,
      samples: model.samples,
      ...(all || !filter ? {} : { only: filter }),
    });
    expect(coreResults.filter((result) => result.status !== "pass")).toEqual([]);
    const components = await runProbes({ defs: registry.defs, only, callModel, samples: model.samples });
    expect(components.filter((result) => result.status !== "pass")).toEqual([]);
    const metas = registry.packComposeArchetypes;
    const layouts = all ? undefined : selectedLayouts(metas, suite);
    if (layouts && !layouts.length) return;
    const compose = await runComposeProbes({
      archetypes: metas,
      probes: (packComposeProbes as Partial<Record<PackId, readonly ComposeProbe[]>>)[id] ?? [],
      ...(layouts ? { only: layouts } : {}),
      defs: Object.fromEntries(registry.defs.map((def) => [def.meta.id, def])),
      cast: { things: [], items: [] },
      callModel,
      samples: model.samples,
    });
    expect(compose.filter((result) => result.status !== "pass")).toEqual([]);
  });
});
