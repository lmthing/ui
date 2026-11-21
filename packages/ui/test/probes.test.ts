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
  type CallModel,
  type PackId,
  type PackMeta,
  type ComposeProbe,
} from "@lmthing/ui/catalog";

import { probeModels, replayCall } from "../scripts";
import { componentFilter, selectedIds, selectedLayouts, wholePack } from "../scripts/build";
import { partialRunAnnotation } from "./known";

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

function expectPassing(results: readonly { status: string }[]) {
  expect(results.filter((result) => result.status !== "pass")).toEqual([]);
}

async function replayPackComposition(
  id: PackId,
  registry: ReturnType<typeof createRegistry>,
  callModel: CallModel,
  samples: number,
  all: boolean,
) {
  const metas = registry.packComposeArchetypes;
  const layouts = all ? undefined : selectedLayouts(metas, suite);
  if (layouts && !layouts.length) return;
  expectPassing(
    await runComposeProbes({
      archetypes: metas,
      probes: (packComposeProbes as Partial<Record<PackId, readonly ComposeProbe[]>>)[id] ?? [],
      ...(layouts ? { only: layouts } : {}),
      defs: Object.fromEntries(registry.defs.map((def) => [def.meta.id, def])),
      cast: { things: [], items: [] },
      callModel,
      samples,
    }),
  );
}

describe.each(required)("pack probes on $id", ({ id: model, samples }) => {
  it.for(compositionPacks)(
    "%s passes selection, component and composition probes",
    async (id, { annotate }) => {
      const all = wholePack(id, suite);
      if (!all) await annotate("Only selected components and layouts were replayed.", partialRunAnnotation);
      const registry = createRegistry({ packs: [id], includeDrafts: true });
      const callModel = replayCall(`pack/${id}`, model);
      const members = registry.ids.filter((name) => packMembers[name] === id);
      const only = all ? members : selectedIds(members, suite);
      const core = packMeta[id]!.probes.filter((probe) => probe.kind === "choose");
      const stages = await Promise.allSettled([
        selectedPacks.includes(id)
          ? runPackProbes({ packs, only: [id], samples, callModel }).then((results) => {
              expect(
                results
                  .filter((result) => result.status !== "pass")
                  .map((result) => `${result.component}: ${result.detail}`),
              ).toEqual([]);
            })
          : undefined,
        runProbes({
          defs: registry.defs.map((def) => ({
            ...def,
            probes: core.filter((probe) => probe.expect === def.meta.id),
          })),
          callModel,
          samples,
          ...(all || !filter ? {} : { only: filter }),
        }).then(expectPassing),
        runProbes({ defs: registry.defs, only, callModel, samples }).then(expectPassing),
        replayPackComposition(id, registry, callModel, samples, Boolean(all)),
      ]);
      const errors = stages.flatMap((stage) =>
        stage.status === "rejected" ? [stage.reason as unknown] : [],
      );
      if (errors.length === 1) throw errors[0];
      if (errors.length > 1) throw new AggregateError(errors, errors.map(String).join("\n"));
    },
  );
});
