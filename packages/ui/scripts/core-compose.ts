import type { CallModel } from "../src/catalog/probes/types";
import type { ProbeModel } from "./llm.config";
import { keyOf, readBook, writeBook, replayCall } from "./recordings";
import type * as Catalog from "../src/entry/catalog";
import type { CastLike } from "../src/catalog/types";
const { archetypes, components, runComposeProbes } = (await import(
  new URL("../dist/catalog.js", import.meta.url).href
)) as typeof Catalog;
import { compositionCast } from "./compose-casts";
export async function checkCoreComposition(
  model: ProbeModel,
  liveCall: (prompt: string) => Promise<string>,
  replay = false,
  only: readonly string[] = [],
) {
  const book = readBook("Archetypes", model.id);
  const call: CallModel = replay
    ? replayCall("Archetypes", model.id)
    : async (prompt, sample = 0) => {
        const reply = await liveCall(prompt),
          key = keyOf(model.id, prompt);
        const replies = sample === 0 ? [] : [...(book[key]?.replies ?? [])];
        replies[sample] = reply;
        book[key] = { prompt, reply: replies[0]!, replies };
        return reply;
      };
  const results = await runComposeProbes({
    archetypes: Object.values(archetypes).map((def) => def.meta),
    defs: components,
    cast: compositionCast,
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
