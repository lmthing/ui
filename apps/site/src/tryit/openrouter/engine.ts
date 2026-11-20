// Tier 3: one of OpenRouter's free models, called from this browser with the visitor's own key.
import type { Engine, RunInput } from "../engines/types";
import type { FreeModel } from "./models";

export const chatUrl = "https://openrouter.ai/api/v1/chat/completions";
/** Why a run failed: the key (reconnect), the free quota (try later), or the model (pick another). */
export type FailKind = "key" | "quota" | "model";
export type Failure = Error & { kind: FailKind };

const fail = (message: string, kind: FailKind): Failure => Object.assign(new Error(message), { kind });
const kindOf = (status: number): FailKind =>
  status === 401 || status === 403 ? "key" : status === 402 || status === 429 ? "quota" : "model";

function body(model: FreeModel, prompt: string, schema: object) {
  const format =
    model.support === "schema"
      ? { type: "json_schema", json_schema: { name: "screen", strict: true, schema } }
      : model.support === "json"
        ? { type: "json_object" }
        : undefined;
  // Without strict schemas the model only has the instructions, so the schema goes into the prompt.
  const spelled =
    model.support === "schema"
      ? ""
      : `\n\nReply with JSON only, matching this JSON Schema:\n${JSON.stringify(schema)}`;
  return {
    model: model.id,
    stream: true,
    max_tokens: 6000,
    messages: [{ role: "user", content: prompt + spelled }],
    ...(format ? { response_format: format } : {}),
    ...(model.support === "schema" ? { provider: { require_parameters: true } } : {}),
  };
}

/** Reads OpenRouter's server-sent events; calls `onDelta` with content and reasoning pieces as they arrive. */
export async function readStream(
  stream: ReadableStream<Uint8Array>,
  onDelta: (content: string, reasoning: string) => void,
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const data = line.startsWith("data:") ? line.slice(5).trim() : "";
      if (!data || data === "[DONE]") continue; // ": OPENROUTER PROCESSING" keep-alives are comments
      const chunk = JSON.parse(data) as {
        error?: { message?: string; code?: number };
        choices?: { delta?: { content?: string | null; reasoning?: string | null } }[];
      };
      if (chunk.error) throw fail(chunk.error.message ?? "stream error", kindOf(chunk.error.code ?? 0));
      const delta = chunk.choices?.[0]?.delta;
      if (delta) onDelta(delta.content ?? "", delta.reasoning ?? "");
    }
  }
}

export function openRouterEngine(key: string, model: FreeModel, fetchImpl: typeof fetch = fetch): Engine {
  return {
    tier: 3,
    label: "OpenRouter",
    model: `${model.name} (free, your account)`,
    async run({ prompt, schema, signal, onText, onStatus }: RunInput) {
      onStatus(`Asking ${model.name} on OpenRouter`);
      const response = await fetchImpl(chatUrl, {
        method: "POST",
        signal,
        headers: {
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
          "HTTP-Referer": "https://lmthing.github.io/ui/",
          "X-Title": "lmthing/ui",
        },
        body: JSON.stringify(body(model, prompt, schema)),
      });
      if (!response.ok || !response.body) {
        const error = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
        throw fail(error.error?.message ?? `HTTP ${response.status}`, kindOf(response.status));
      }
      let text = "";
      await readStream(response.body, (content, reasoning) => {
        if (reasoning && !text) onStatus(`${model.name} is thinking`);
        if (!content) return;
        text += content;
        onText(text);
      });
      if (!text) throw fail("the model returned no text", "model");
    },
  };
}
