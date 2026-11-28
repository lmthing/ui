import { performance } from "node:perf_hooks";
import { z } from "zod";
import { imageFraming, type ImageKind } from "../../src/catalog/images/runtime";
import type { Route } from "./fixtures";

const tokenCount = z.int().nonnegative();
const responseSchema = z.object({
  data: z.array(z.object({ b64_json: z.string().min(1) })).length(1),
  usage: z
    .object({
      input_tokens: tokenCount,
      output_tokens: tokenCount,
      input_tokens_details: z.object({ text_tokens: tokenCount }).optional(),
    })
    .optional(),
});

export function imageRequestSize(kind: ImageKind, route: Route) {
  return route.id === "image2-low"
    ? imageFraming[kind] === "wide"
      ? "1024x640"
      : "832x832"
    : imageFraming[kind] === "wide"
      ? "1536x1024"
      : "1024x1024";
}

export function azureImageGenerator() {
  const endpoint = process.env.LMTHINGAPP_ENDPOINT;
  const key = process.env.LMTHINGAPP_API_KEY;
  if (!endpoint || !key) throw new Error("Set LMTHINGAPP_ENDPOINT and LMTHINGAPP_API_KEY");
  const url = new URL("/openai/v1/images/generations?api-version=preview", endpoint);
  if (url.protocol !== "https:" || url.username || url.password)
    throw new Error("Expected Azure HTTPS endpoint");
  return async (prompt: string, route: Route, kind: ImageKind) => {
    const start = performance.now();
    const response = await fetch(url, {
      method: "POST",
      headers: { "api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: route.model,
        prompt,
        quality: route.quality,
        size: imageRequestSize(kind, route),
        n: 1,
        output_format: "jpeg",
        output_compression: 75,
      }),
      redirect: "error",
      signal: AbortSignal.timeout(180_000),
    });
    if (!response.ok)
      return {
        ok: false as const,
        status: response.status,
        retryAfter: Number(response.headers.get("retry-after")) || 0,
      };
    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error("Unexpected Azure image response");
    const { data, usage } = parsed.data;
    return {
      ok: true as const,
      jpeg: Buffer.from(data[0]!.b64_json, "base64"),
      seconds: (performance.now() - start) / 1_000,
      inputTokens: usage?.input_tokens_details?.text_tokens ?? usage?.input_tokens ?? null,
      outputTokens: usage?.output_tokens ?? null,
    };
  };
}
