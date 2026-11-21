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
  type ComposeProbe,
} from "@lmthing/ui/catalog";

import { probeModels, replayCall } from "../scripts";
import { selectedIds, selectedLayouts } from "../scripts/build";
import { partialRunAnnotation } from "./known";

const registry = createRegistry({ includeDrafts: true });
const required = probeModels.filter((model) => model.required);
const selectedPacks = (Object.keys(packs) as PackId[]).filter(
  (id) =>
    !process.env.UI_TEST_COMPONENTS ||
    selectedIds(Object.keys(packOf)).some((name) => (packOf as Record<string, PackId>)[name] === id),
);

describe.each(required)("shared variant probes on $id", (model) => {
  it("replays every requested and plain brief with a passing majority", async () => {
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
  });
});

describe.each(required)("probes on $id", (model) => {
  it.each(selectedIds(registry.ids))("%s passes its probes", async (id) => {
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
) {
  const metas = registry.packComposeArchetypes;
  const layouts = selectedLayouts(metas);
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
  it.for(selectedPacks)("%s passes selection, component and composition probes", async (id, { annotate }) => {
    const partial = Boolean(process.env.UI_TEST_COMPONENTS);
    if (partial) await annotate("Only selected components and layouts were replayed.", partialRunAnnotation);
    const registry = createRegistry({ packs: [id], includeDrafts: true });
    const callModel = replayCall(`pack/${id}`, model);
    const only = selectedIds(registry.ids.filter((name) => (packOf as Record<string, PackId>)[name] === id));
    const core = (packs as Partial<Record<PackId, import("@lmthing/ui/catalog").PackMeta>>)[
      id
    ]!.probes.filter((probe) => probe.kind === "choose");
    const stages = await Promise.allSettled([
      runPackProbes({ packs, only: [id], samples, callModel }).then((results) => {
        expect(
          results
            .filter((result) => result.status !== "pass")
            .map((result) => `${result.component}: ${result.detail}`),
        ).toEqual([]);
      }),
      runProbes({
        defs: registry.defs.map((def) => ({
          ...def,
          probes: core.filter((probe) => probe.expect === def.meta.id),
        })),
        callModel,
        samples,
        ...(partial ? { only } : {}),
      }).then(expectPassing),
      runProbes({ defs: registry.defs, only, callModel, samples }).then(expectPassing),
      replayPackComposition(id, registry, callModel, samples),
    ]);
    const errors = stages.flatMap((stage) => (stage.status === "rejected" ? [stage.reason as unknown] : []));
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) throw new AggregateError(errors, errors.map(String).join("\n"));
  });
});
