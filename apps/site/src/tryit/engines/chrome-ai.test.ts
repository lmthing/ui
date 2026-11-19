import { describe, expect, it } from "vitest";
import { chromeAiAvailability, chromeEngine, type LanguageModelApi } from "./chrome-ai";

const streaming = (chunks: string[], seen: { options?: unknown }): LanguageModelApi => ({
  availability: async () => "available",
  create: async () => ({
    promptStreaming: (_prompt, options) => {
      seen.options = options;
      return new ReadableStream<string>({ start: (c) => (chunks.forEach((x) => c.enqueue(x)), c.close()) });
    },
  }),
});

describe("chrome engine", () => {
  it("reports unavailable when the API is missing or throws", async () => {
    expect(await chromeAiAvailability(undefined)).toBe("unavailable");
    expect(
      await chromeAiAvailability({
        availability: async () => Promise.reject(new Error("x")),
        create: async () => ({}) as never,
      }),
    ).toBe("unavailable");
  });
  it("streams chunks into growing text and passes the schema as responseConstraint", async () => {
    const seen: { options?: unknown } = {};
    const texts: string[] = [];
    const schema = { type: "object" };
    await chromeEngine(streaming(['{"lines"', ":[]}"], seen)).run({
      prompt: "p",
      schema,
      signal: new AbortController().signal,
      onText: (t) => texts.push(t),
      onStatus: () => {},
    });
    expect(texts).toEqual(['{"lines"', '{"lines":[]}']);
    expect((seen.options as { responseConstraint: unknown }).responseConstraint).toBe(schema);
  });
});
