// Replays the recorded model replies: every component's probes must pass on every required model.
// A missing recording fails with the command to run (pnpm llm:check --component <Id>).
import { describe, expect, it } from "vitest";
import {
  createRegistry,
  runProbes,
  runPackProbes,
  packs,
  packOf,
  packArchetypes,
  packComposition,
  runComposeProbes,
  type PackId,
} from "@lmthing/ui/catalog";

import { existsSync } from "node:fs";
import { probeModels, replayCall } from "../scripts";
import { selectedIds, selectedLayouts } from "../scripts/build";

const known = (id: string) => existsSync(`${import.meta.dirname}/known/${id}.md`);

const registry = createRegistry({ includeDrafts: true });
const required = probeModels.filter((model) => model.required);
const selectedPacks = (Object.keys(packs) as PackId[]).filter(
  (id) =>
    !process.env.UI_TEST_COMPONENTS ||
    selectedIds(Object.keys(packOf)).some((name) => (packOf as Record<string, PackId>)[name] === id),
);

describe.each(required)("probes on $id", (model) => {
  it.each(selectedIds(registry.ids))("%s passes its probes", async (id) => {
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
  it("replays every pack probe with a passing majority", async () => {
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
  it.each(selectedPacks)("%s passes every component and every layout", async (id) => {
    const registry = createRegistry({ packs: [id], includeDrafts: true });
    const callModel = replayCall(`pack/${id}`, model.id);
    const only = selectedIds(registry.ids.filter((name) => (packOf as Record<string, PackId>)[name] === id));
    const core = (packs as Partial<Record<PackId, import("@lmthing/ui/catalog").PackMeta>>)[
      id
    ]!.probes.filter((probe) => probe.kind === "choose");
    const coreResults = await runProbes({
      defs: registry.defs.map((def) => ({
        ...def,
        probes: core.filter((probe) => probe.expect === def.meta.id),
      })),
      callModel,
      samples: model.samples,
      ...(process.env.UI_TEST_COMPONENTS ? { only } : {}),
    });
    expect(coreResults.filter((result) => result.status !== "pass")).toEqual([]);
    const components = await runProbes({ defs: registry.defs, only, callModel, samples: model.samples });
    expect(components.filter((result) => result.status !== "pass")).toEqual([]);
    const metas = (
      packArchetypes as Partial<Record<PackId, readonly import("@lmthing/ui/catalog").ArchetypeMeta[]>>
    )[id]!.map(packComposition);
    const layouts = selectedLayouts(metas);
    if (layouts && !layouts.length) return;
    const compose = await runComposeProbes({
      archetypes: metas,
      ...(layouts ? { only: layouts } : {}),
      defs: Object.fromEntries(registry.defs.map((def) => [def.meta.id, def])),
      cast: { things: [], items: [] },
      callModel,
      samples: model.samples,
    });
    expect(compose.filter((result) => result.status !== "pass")).toEqual([]);
  });
});
