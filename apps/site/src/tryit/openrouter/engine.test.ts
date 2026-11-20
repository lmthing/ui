import { describe, expect, it } from "vitest";
import { openRouterEngine, readStream, type Failure } from "./engine";
import type { FreeModel } from "./models";

const model: FreeModel = { id: "d/strict:free", name: "Strict", context: 8000, support: "schema" };
const sse = (...events: string[]) =>
  new Response(events.map((e) => `${e}\n\n`).join(""), { headers: { "content-type": "text/event-stream" } });
const delta = (content: string) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}`;

async function runWith(response: Response) {
  const seen: string[] = [];
  const engine = openRouterEngine("sk-or-v1-test", model, async () => response);
  const signal = new AbortController().signal;
  await engine.run({
    prompt: "p",
    schema: {},
    signal,
    onText: (t) => seen.push(t),
    onStatus: () => undefined,
  });
  return seen;
}

describe("openRouterEngine", () => {
  it("streams content, skipping keep-alives and [DONE]", async () => {
    const seen = await runWith(
      sse(": OPENROUTER PROCESSING", delta('{"lines"'), delta(":[]}"), "data: [DONE]"),
    );
    expect(seen).toEqual(['{"lines"', '{"lines":[]}']);
  });
  it("names the failure kind from the HTTP status", async () => {
    const error = (status: number) =>
      runWith(new Response(JSON.stringify({ error: { message: "no" } }), { status })).then(
        () => ({ kind: "none", message: "" }),
        (e: Failure) => e,
      );
    expect((await error(401)).kind).toBe("key");
    expect((await error(429)).kind).toBe("quota");
    expect((await error(400)).kind).toBe("model");
    expect((await error(400)).message).toBe("no");
  });
  it("fails on an error inside the stream and on an empty reply", async () => {
    const mid = sse(delta("{"), `data: ${JSON.stringify({ error: { message: "overloaded", code: 502 } })}`);
    await expect(runWith(mid)).rejects.toMatchObject({ message: "overloaded", kind: "model" });
    await expect(runWith(sse("data: [DONE]"))).rejects.toMatchObject({ kind: "model" });
  });
  it("reads events split across chunks", async () => {
    const encoder = new TextEncoder();
    const parts = ['data: {"choices":[{"delta":{"con', 'tent":"hi"}}]}\n\n'];
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        parts.forEach((p) => c.enqueue(encoder.encode(p)));
        c.close();
      },
    });
    const got: string[] = [];
    await readStream(stream, (content) => content && got.push(content));
    expect(got).toEqual(["hi"]);
  });
});
