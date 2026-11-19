import type { Engine, RunInput } from "./types";

type Session = {
  promptStreaming: (prompt: string, options?: object) => ReadableStream<string>;
  destroy?: () => void;
};
export type LanguageModelApi = {
  availability: (options?: object) => Promise<string>;
  create: (options?: object) => Promise<Session>;
};

const options = {
  expectedInputs: [{ type: "text", languages: ["en"] }],
  expectedOutputs: [{ type: "text", languages: ["en"] }],
};
const api = (): LanguageModelApi | undefined =>
  (globalThis as { LanguageModel?: LanguageModelApi }).LanguageModel;

/** "available", "downloadable", "downloading" or "unavailable" (also when the API is missing or throws). */
export async function chromeAiAvailability(lm: LanguageModelApi | undefined = api()): Promise<string> {
  if (!lm) return "unavailable";
  try {
    return await lm.availability(options);
  } catch {
    return "unavailable";
  }
}

/** Chrome's built-in model (Gemini Nano) through the Prompt API, constrained by `responseConstraint`. */
export function chromeEngine(lm: LanguageModelApi | undefined = api()): Engine {
  return {
    tier: 1,
    label: "Chrome built-in AI",
    model: "Gemini Nano (Prompt API)",
    async run({ prompt, schema, signal, onText, onStatus }: RunInput) {
      if (!lm) throw new Error("The Prompt API is not available");
      onStatus("Starting the on-device model");
      const session = await lm.create({
        ...options,
        signal,
        monitor: (m: EventTarget) =>
          m.addEventListener("downloadprogress", (e) =>
            onStatus(
              `Downloading the model: ${Math.round(((e as unknown as { loaded: number }).loaded ?? 0) * 100)}%`,
            ),
          ),
      });
      try {
        onStatus("Writing");
        const reader = session.promptStreaming(prompt, { responseConstraint: schema, signal }).getReader();
        let text = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          text += value;
          onText(text);
        }
      } finally {
        session.destroy?.();
      }
    },
  };
}
