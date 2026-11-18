import type { WriterFormat } from "@lmthing/ui/catalog";
import type { ProbeModel } from "./llm.config";

/** Transport failures are not model answers: retry network, rate limits and server errors only. */
export async function azure(model: ProbeModel, prompt: string, format?: WriterFormat): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await azureOnce(model, prompt, format);
    } catch (error) {
      const message = (error as Error).message;
      const transient = /fetch failed|ECONN|ETIMEDOUT|unavailable (429|5\d\d)|high demand/i.test(message);
      if (!transient || attempt >= 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000 * 2 ** attempt));
    }
  }
}

async function azureOnce(model: ProbeModel, prompt: string, format?: WriterFormat): Promise<string> {
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
      ...(format ? { response_format: format } : {}),
    }),
  });
  const body = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(`unavailable ${response.status}: ${body.error?.message ?? ""}`);
  if (!body.choices?.length) throw new Error("Azure returned no choices for the supplied response format");
  return body.choices?.[0]?.message?.content ?? "";
}
