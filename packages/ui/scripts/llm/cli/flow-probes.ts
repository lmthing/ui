import type * as Catalog from "@lmthing/ui/catalog";
import { azure, readBook, recordingCall, replayCall, writeBook, type ProbeModel } from "../index";

const { flowTemplates, components, runFlowProbes } = (await import(
  new URL("../../../dist/catalog.js", import.meta.url).href
)) as typeof Catalog;

export async function checkFlows(model: ProbeModel, replay: boolean, only?: string, probe?: string) {
  const menu = flowTemplates.list;
  const selected = only === undefined ? menu : menu.filter(({ id }) => id === only);
  if (!selected.length) throw new Error(`Unknown flow template: ${only}`);
  let failed = 0;
  for (const template of selected) {
    const path = `flows/${template.id}`;
    const book = replay ? undefined : readBook(path, model.id);
    const call = book
      ? recordingCall(model.id, book, (prompt, _sample, format) => azure(model, prompt, format))
      : replayCall(path, model.id);
    const results = await runFlowProbes(template, menu, components, call, model.samples, probe);
    if (book) writeBook(path, model.id, book);
    for (const result of results) {
      if (!result.passed) failed++;
      console.log(
        `${result.passed ? "PASS" : "FAIL"} ${result.score} ${model.id} ${result.id}: ${result.request}`,
      );
      for (const [index, sample] of result.samples.entries())
        console.log(`  ${index + 1}. ${sample.error ?? "pass"} ${sample.reply?.trim() ?? "(no reply)"}`);
    }
  }
  return failed;
}
