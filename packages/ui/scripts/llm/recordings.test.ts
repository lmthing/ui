import { createHash } from "node:crypto";
import { expect, it, vi, afterEach } from "vitest";
import { z } from "zod";
import {
  components,
  runProbes,
  writerFormatFor,
  type Definition,
  type ReplayProbe,
} from "@lmthing/ui/catalog";
import { keyOf, replayBook, recordingCall, recordingKey, type Book } from "./recordings";

afterEach(() => vi.restoreAllMocks());
const probe: ReplayProbe = { id: "List/choose/show plants", definition: {}, localPrompt: "same" };
it("resumes unchanged pack samples, including failures, and calls changed prompts or formats", async () => {
  const live = vi.fn(async () => "fresh");
  const book = {
    [recordingKey("model", "same", undefined, probe)]: {
      prompt: "same",
      reply: "failed",
      replies: ["failed"],
    },
  };
  const call = recordingCall("model", book, live, "pack/example");
  expect(await call("same", 0, undefined, probe)).toBe("failed");
  expect(live).not.toHaveBeenCalled();
  expect(await call("same", 1, undefined, probe)).toBe("fresh");
  expect(await call("changed", 0, undefined, probe)).toBe("fresh");
  expect(await call("same", 0, writerFormatFor(components.List), probe)).toBe("fresh");
  expect(live).toHaveBeenCalledTimes(3);
  expect(await call("same", 0, undefined, probe)).toBe("failed");
  expect(await call("same", 1, undefined, probe)).toBe("fresh");
  expect(live).toHaveBeenCalledTimes(3);
  expect(await call("same", 0, undefined, { ...probe, definition: { changed: true } })).toBe("fresh");
  expect(live).toHaveBeenCalledTimes(4);
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
  const call = replayBook("List", "model", {
    [recordingKey("model", "prompt", format, probe)]: {
      prompt: "prompt",
      format,
      reply: "first",
      replies: ["first", "second"],
    },
  });
  expect(await call("prompt", 1, format, probe)).toBe("second");
  await expect(call("prompt", 0, undefined, probe)).rejects.toThrow("No recording");
  await expect(call("prompt", 2, format, probe)).rejects.toThrow("No recording");
});

const list: Definition = {
  ...components.List,
  probes: [{ kind: "choose", need: "Show my plants", expect: "List" }],
};

async function recordedChoice() {
  const book: Book = {};
  const live = recordingCall("model", book, async () => "List");
  await runProbes({ defs: [list, components.Card], only: ["List"], samples: 2, callModel: live });
  return replayBook("List", "model", book);
}

it("replays an unchanged choose probe across catalog drift and counts it once", async () => {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const callModel = await recordedChoice();
  const options = { only: ["List"], samples: 2, callModel };
  expect(await runProbes({ ...options, defs: [list, components.Card] })).toMatchObject([{ score: "2/2" }]);
  expect(log).not.toHaveBeenCalled();
  const changed = { ...components.Card, meta: { ...components.Card.meta, pick: "Changed choice prose." } };
  expect(await runProbes({ ...options, defs: [changed, list] })).toMatchObject([{ score: "2/2" }]);
  expect(log.mock.calls).toEqual([["prompt drift (1): List on model, List/choose/Show my plants"]]);
});

it.each([
  ["schema", { props: list.props.extend({ extra: z.string().max(12) }) }],
  ["metadata", { meta: { ...list.meta, weight: 3 as const } }],
  ["model-facing text", { meta: { ...list.meta, writeHints: ["Changed Writer instruction."] } }],
  ["probe text", { probes: [{ kind: "choose", need: "Find my plants", expect: "List" }] as const }],
])("misses when the probed component's %s changes", async (_label, changes) => {
  const callModel = await recordedChoice();
  await expect(
    runProbes({ defs: [{ ...list, ...changes }, components.Card], only: ["List"], callModel }),
  ).rejects.toThrow("No recording");
});
