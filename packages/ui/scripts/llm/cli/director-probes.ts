import type * as Catalog from "@lmthing/ui/catalog";
import { azure, recordingCall, readBook, replayCall, writeBook, type ProbeModel } from "../index";

const { packs, packIndex, runPackProbes } = (await import(
  new URL("../../../dist/catalog.js", import.meta.url).href
)) as typeof Catalog;
const concurrentPacks = 8;
const directorPrefix = "Choose the domain packs this app needs from the index below.";

async function checkPack(model: ProbeModel, id: Catalog.PackId, replay: boolean) {
  const recording = `pack/${id}`;
  const book = replay
    ? {}
    : Object.fromEntries(
        Object.entries(readBook(recording, model.id)).filter(
          ([, evidence]) => !evidence.prompt.startsWith(directorPrefix),
        ),
      );
  const callModel = replay
    ? replayCall(recording, model.id)
    : recordingCall(model.id, book, (prompt) => azure(model, prompt));
  const results = await runPackProbes({ packs, only: [id], samples: model.samples, callModel });
  if (!replay && results.length) writeBook(recording, model.id, book);
  return results;
}

/** Re-record just the Director choices, leaving each pack's Writer evidence intact. */
export async function checkDirector(model: ProbeModel, replay: boolean): Promise<number> {
  if (!replay && (!process.env.AZURE_OPENAI_ENDPOINT || !process.env.AZURE_OPENAI_API_KEY))
    throw new Error("AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY must be set");
  let failed = 0;
  for (let start = 0; start < packIndex.length; start += concurrentPacks) {
    const batch = packIndex.slice(start, start + concurrentPacks);
    const checks = await Promise.allSettled(batch.map(({ id }) => checkPack(model, id, replay)));
    for (const [index, check] of checks.entries()) {
      if (check.status === "rejected") {
        console.log(`ERROR ${model.id} ${batch[index]!.id}: ${String(check.reason)}`);
        failed++;
        continue;
      }
      for (const { status, score, component, probe, reply } of check.value) {
        if (probe.kind !== "pack") continue;
        console.log(`${status.toUpperCase()} ${score} ${model.id} ${component}: ${probe.idea}`);
        console.log(`        reply: ${JSON.stringify(reply.trim())}`);
        if (status !== "pass") failed++;
      }
    }
  }
  return failed;
}
