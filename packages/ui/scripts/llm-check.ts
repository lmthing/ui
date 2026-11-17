// pnpm llm:check [--component List,Header] [--replay]
// Runs component probes live on every model in llm.config.ts, records replies, prints results.
// Exits 1 if any probe fails on a required model.
// Imports the built data-only catalog (dist/catalog.js): the views need React Native, Node does not have it.
import type { ProbeResult } from "../src/catalog/probes";
import type * as Catalog from "../src/entry/catalog";
import { probeModels, type ProbeModel } from "./llm.config";
import { keyOf, readBook, replayCall, writeBook } from "./recordings";

const { createRegistry, runProbes } = (await import(
  new URL("../dist/catalog.js", import.meta.url).href
)) as typeof Catalog;

function arg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function azure(model: ProbeModel, prompt: string): Promise<string> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/$/, "");
  const key = process.env.AZURE_OPENAI_API_KEY;
  if (!endpoint || !key) throw new Error("AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY must be set");
  const response = await fetch(`${endpoint}/openai/v1/chat/completions`, {
    method: "POST",
    headers: { "api-key": key, "content-type": "application/json" },
    body: JSON.stringify({
      model: model.deployment,
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: model.maxTokens,
    }),
  });
  const body = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(`unavailable: ${body.error?.message?.slice(0, 80) ?? response.status}`);
  return body.choices?.[0]?.message?.content ?? "";
}

function print(model: ProbeModel, results: ProbeResult[]) {
  for (const r of results) {
    const what =
      r.probe.kind === "read" ? r.probe.task : r.probe.kind === "choose" ? r.probe.need : r.probe.brief;
    console.log(
      `${r.status.toUpperCase().padEnd(7)} ${(r.score ?? "").padEnd(4)} ${model.id.padEnd(16)} ${r.component} ${r.probe.kind}: ${what}`,
    );
    if (r.status === "fail" || r.detail.startsWith("unstable"))
      console.log(`        ${r.detail}\n        reply: ${r.reply.trim().slice(0, 300)}`);
  }
}

async function runModel(model: ProbeModel, only: string[], replay: boolean) {
  const registry = createRegistry({ includeDrafts: true });
  const ids = only.length ? only : registry.ids;
  let failed = 0;
  for (const id of ids) {
    const book = readBook(id, model.id);
    const live = async (prompt: string, sample = 0) => {
      const reply = await azure(model, prompt);
      const key = keyOf(model.id, prompt);
      const replies = [...(sample === 0 ? [] : (book[key]?.replies ?? []))];
      replies[sample] = reply;
      book[key] = { prompt, reply: replies[0] ?? reply, replies };
      return reply;
    };
    try {
      const results = await runProbes({
        defs: registry.defs,
        callModel: replay ? replayCall(id, model.id) : live,
        only: [id],
        samples: model.samples,
      });
      if (!replay) writeBook(id, model.id, book);
      print(model, results);
      if (model.required) failed += results.filter((r) => r.status === "fail").length;
    } catch (error) {
      console.log(`ERROR   ${model.id.padEnd(16)} ${id}: ${(error as Error).message}`);
      if (model.required) failed += 1;
    }
  }
  return failed;
}

const only = (arg("--component") ?? "").split(",").filter(Boolean);
const replay = process.argv.includes("--replay");
let failed = 0;
for (const model of probeModels) failed += await runModel(model, only, replay);
console.log(failed ? `\n${failed} failure(s) on required models.` : "\nAll required probes pass.");
process.exit(failed ? 1 : 0);
