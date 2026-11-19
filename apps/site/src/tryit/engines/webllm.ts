import type { Engine, RunInput } from "./types";

/** About 1.5B parameters, 4-bit: a download of roughly a gigabyte, from WebLLM's prebuilt list. */
export const webllmModel = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

/** The model to load: the default, or `?webllm-model=<id>` in the URL (used to test with a smaller one). */
const modelId = () =>
  new URLSearchParams(globalThis.location?.search ?? "").get("webllm-model") || webllmModel;

type Chunk = { choices: { delta: { content?: string | null } }[] };
export type ChatEngine = {
  chat: { completions: { create: (request: object) => Promise<AsyncIterable<Chunk>> } };
};
export type Loader = (model: string, onProgress: (text: string) => void) => Promise<ChatEngine>;

/** WebGPU with a real adapter; without it WebLLM cannot run. */
export async function hasWebGpu(): Promise<boolean> {
  const gpu = (navigator as { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
  if (!gpu) return false;
  try {
    return Boolean(await gpu.requestAdapter());
  } catch {
    return false;
  }
}

/** Loads WebLLM lazily and runs the model in a Web Worker, so the page stays smooth. Cached in Cache Storage. */
export const loadInWorker: Loader = async (model, onProgress) => {
  const { CreateWebWorkerMLCEngine } = await import("@mlc-ai/web-llm");
  const worker = new Worker(new URL("./webllm.worker.ts", import.meta.url), { type: "module" });
  const engine = await CreateWebWorkerMLCEngine(worker, model, {
    initProgressCallback: (r) => onProgress(r.text),
  });
  return engine as unknown as ChatEngine;
};

/** The WebLLM engine. `prepare` is the explicit download; `run` fails if it has not happened. */
export function webllmEngine(
  load: Loader = loadInWorker,
): Engine & { prepare: (onStatus: (s: string) => void) => Promise<void> } {
  let loaded: Promise<ChatEngine> | null = null;
  const prepare = async (onStatus: (s: string) => void) => {
    loaded ??= load(modelId(), onStatus).catch((error) => ((loaded = null), Promise.reject(error)));
    await loaded;
  };
  return {
    tier: 2,
    label: "WebLLM (WebGPU)",
    get model() {
      return `${modelId().replace("-MLC", "")}, running in your browser`;
    },
    prepare,
    async run({ prompt, schema, signal, onText, onStatus }: RunInput) {
      if (!loaded) throw new Error("Download the model first");
      const engine = await loaded;
      onStatus("Writing");
      const stream = await engine.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        stream: true,
        temperature: 0.4,
        max_tokens: 1200,
        response_format: { type: "json_object", schema: JSON.stringify(schema) },
      });
      let text = "";
      for await (const chunk of stream) {
        if (signal.aborted) break;
        text += chunk.choices[0]?.delta.content ?? "";
        onText(text);
      }
    },
  };
}
