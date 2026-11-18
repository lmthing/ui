import type { CallModel, WriterFormat } from "@lmthing/ui/catalog";
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
  liveCall: (prompt: string, format?: WriterFormat) => Promise<string>,
  replay = false,
  only: readonly string[] = [],
) {
  const book = readBook("Archetypes", model.id);
  const call: CallModel = replay
    ? replayCall("Archetypes", model.id)
    : async (prompt, sample = 0, format) => {
        const reply = await liveCall(prompt, format),
          key = keyOf(model.id, prompt, format);
        const replies = sample === 0 ? [] : [...(book[key]?.replies ?? [])];
        replies[sample] = reply;
        book[key] = { prompt, ...(format ? { format } : {}), reply: replies[0]!, replies };
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
