import { describe, expect, it } from "vitest";
import { webllmEngine, webllmModel, type ChatEngine } from "./webllm";

function fake(requests: object[]): ChatEngine {
  return {
    chat: {
      completions: {
        create: async (request) => {
          requests.push(request);
          return (async function* () {
            yield { choices: [{ delta: { content: '{"lines"' } }] };
            yield { choices: [{ delta: { content: ":[]}" } }] };
          })();
        },
      },
    },
  };
}

describe("webllm engine", () => {
  it("refuses to run before the explicit download", async () => {
    const engine = webllmEngine(async () => fake([]));
    await expect(
      engine.run({
        prompt: "p",
        schema: {},
        signal: new AbortController().signal,
        onText: () => {},
        onStatus: () => {},
      }),
    ).rejects.toThrow(/Download/);
  });
  it("loads the named model once, then streams with a JSON-schema response_format", async () => {
    const requests: object[] = [];
    const loads: string[] = [];
    const engine = webllmEngine(
      async (model, onProgress) => (loads.push(model), onProgress("loading"), fake(requests)),
    );
    const status: string[] = [];
    await engine.prepare((s) => status.push(s));
    await engine.prepare(() => {});
    const texts: string[] = [];
    await engine.run({
      prompt: "write",
      schema: { type: "object" },
      signal: new AbortController().signal,
      onText: (t) => texts.push(t),
      onStatus: () => {},
    });
    expect(loads).toEqual([webllmModel]);
    expect(status).toEqual(["loading"]);
    expect(texts.at(-1)).toBe('{"lines":[]}');
    expect(requests[0]).toMatchObject({
      stream: true,
      response_format: { type: "json_object", schema: '{"type":"object"}' },
    });
  });
});
