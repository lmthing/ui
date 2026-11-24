import { describe, expect, it } from "vitest";
import { archetypes, components, runComposeProbes } from "@lmthing/ui/catalog";
import { compositionHistoryCast, probeModels, replayCall } from "../scripts/llm";
import { selectedLayouts } from "../scripts/build";

const metas = Object.values(archetypes).map((def) => def.meta);
const only = selectedLayouts(metas, import.meta.url);
const layouts =
  only ?? metas.flatMap((meta) => Object.keys(meta.layouts).map((layout) => `${meta.id}/${layout}`));

describe.each(probeModels.filter((model) => model.required))("archetype composition on $id", (model) => {
  expect(layouts).toHaveLength(only?.length ?? 39);
  if (!layouts.length) {
    it.skip("has no selected layouts", () => {});
    return;
  }
  let callModel: ReturnType<typeof replayCall> | undefined;
  it.each(layouts)("%s passes its layout and the text-first rubric", async (layout) => {
    const results = await runComposeProbes({
      archetypes: metas,
      only: [layout],
      defs: components,
      cast: compositionHistoryCast,
      callModel: (callModel ??= replayCall("Archetypes", model.id)),
      samples: model.samples,
      rubric: true,
    });
    expect(results).toHaveLength(1);
    expect(
      results
        .filter((result) => result.status === "fail")
        .map((result) => `${result.archetype}/${result.layout}: ${result.detail}`),
    ).toEqual([]);
  });
});
