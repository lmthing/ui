import { afterEach, expect, it, vi } from "vitest";
import { components, writerFormatFor } from "@lmthing/ui/catalog";
import { azure } from "./azure";
import { probeModels } from "./llm.config";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("sends the supplied format unchanged and omits it for choose/read calls", async () => {
  vi.stubEnv("AZURE_OPENAI_ENDPOINT", "https://provider.invalid/");
  vi.stubEnv("AZURE_OPENAI_API_KEY", "test-only");
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ choices: [{ message: { content: '{"c":"List"}' } }] }),
  });
  vi.stubGlobal("fetch", fetch);
  const format = writerFormatFor(components.List);
  expect(await azure(probeModels[0]!, "write", format)).toBe('{"c":"List"}');
  await azure(probeModels[0]!, "choose");
  expect(fetch.mock.calls[0]?.[0]).toBe("https://provider.invalid/openai/v1/chat/completions");
  expect(JSON.parse(fetch.mock.calls[0]?.[1].body).response_format).toEqual(format);
  expect(JSON.parse(fetch.mock.calls[1]?.[1].body)).not.toHaveProperty("response_format");
});
it("does not retry rejected strict formats and preserves the exact provider error", async () => {
  vi.stubEnv("AZURE_OPENAI_ENDPOINT", "https://provider.invalid");
  vi.stubEnv("AZURE_OPENAI_API_KEY", "test-only");
  const fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 400,
    json: async () => ({ error: { message: "strict schema rejected" } }),
  });
  vi.stubGlobal("fetch", fetch);
  await expect(azure(probeModels[0]!, "write", writerFormatFor(components.List))).rejects.toThrow(
    "unavailable 400: strict schema rejected",
  );
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("rejects Azure's empty-choice schema failure instead of recording an empty model answer", async () => {
  vi.stubEnv("AZURE_OPENAI_ENDPOINT", "https://provider.invalid");
  vi.stubEnv("AZURE_OPENAI_API_KEY", "test-only");
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [] }) });
  vi.stubGlobal("fetch", fetch);
  await expect(azure(probeModels[0]!, "write", writerFormatFor(components.List))).rejects.toThrow(
    "no choices",
  );
  expect(fetch).toHaveBeenCalledTimes(1);
});
