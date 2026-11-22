import type { WriterFormat } from "@lmthing/ui/catalog";
import type { ProbeModel } from "./llm.config";
import { recordingCall, readBook, writeBook, replayCall } from "./recordings";
import type * as Catalog from "@lmthing/ui/catalog";
import type { CastLike } from "@lmthing/ui/catalog";
const { archetypes, components, runComposeProbes } = (await import(
  new URL("../../dist/catalog.js", import.meta.url).href
)) as typeof Catalog;
import { compositionHistoryCast } from "./casts";
export async function checkCoreComposition(
  model: ProbeModel,
  liveCall: (prompt: string, format?: WriterFormat) => Promise<string>,
  replay = false,
  only: readonly string[] = [],
) {
  const book = readBook("Archetypes", model.id);
  const call = replay
    ? replayCall("Archetypes", model.id)
    : recordingCall(model.id, book, (prompt, _sample, format) => liveCall(prompt, format));
  const results = await runComposeProbes({
    archetypes: Object.values(archetypes).map((def) => def.meta),
    defs: components,
    cast: compositionHistoryCast,
    callModel: call,
    samples: model.samples,
    rubric: true,
    only,
  });
  if (!replay) writeBook("Archetypes", model.id, book);
  for (const result of results)
    console.log(
      `${result.status.toUpperCase()} ${result.score} ${result.archetype}/${result.layout}: ${result.detail}${result.rubric ? " " + JSON.stringify(result.rubric) : ""}`,
    );
  return results.filter((result) => result.status === "fail").length;
}
