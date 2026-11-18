import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, it, vi, afterEach } from "vitest";
import { components, writerFormatFor } from "@lmthing/ui/catalog";
import { keyOf, replayCall, recordingCall } from "./recordings";

vi.mock("node:fs", () => ({ readFileSync: vi.fn(), mkdirSync: vi.fn(), writeFileSync: vi.fn() }));
afterEach(() => vi.resetAllMocks());
it("resumes unchanged pack samples, including failures, and calls changed prompts or formats", async () => {
  const live = vi.fn(async () => "fresh");
  const book = { [keyOf("model", "same")]: { prompt: "same", reply: "failed", replies: ["failed"] } };
  const call = recordingCall("model", book, live, true);
  expect(await call("same", 0)).toBe("failed");
  expect(live).not.toHaveBeenCalled();
  expect(await call("same", 1)).toBe("fresh");
  expect(await call("changed", 0)).toBe("fresh");
  expect(await call("same", 0, writerFormatFor(components.List))).toBe("fresh");
  expect(live).toHaveBeenCalledTimes(3);
  expect(await call("same", 1)).toBe("fresh");
  expect(live).toHaveBeenCalledTimes(3);
});
it("hashes the sent format and preserves unformatted choose/read keys", () => {
  const format = writerFormatFor(components.List),
    prompt = "prompt",
    model = "model";
  expect(keyOf(model, prompt, format)).toBe(
    createHash("sha256")
      .update(`${model}\n${prompt}\n${JSON.stringify(format)}`)
      .digest("hex")
      .slice(0, 16),
  );
  expect(keyOf(model, prompt)).not.toBe(keyOf(model, prompt, format));
  expect(keyOf(model, prompt, format)).not.toBe(keyOf(model, prompt, writerFormatFor(components.Header)));
});
it("replays only the exact format and sample that were recorded", async () => {
  const format = writerFormatFor(components.List);
  vi.mocked(readFileSync).mockReturnValue(
    JSON.stringify({
      [keyOf("model", "prompt", format)]: {
        prompt: "prompt",
        format,
        reply: "first",
        replies: ["first", "second"],
      },
    }),
  );
  const call = replayCall("List", "model");
  expect(await call("prompt", 1, format)).toBe("second");
  await expect(call("prompt")).rejects.toThrow("No recording");
  await expect(call("prompt", 2, format)).rejects.toThrow("No recording");
});
