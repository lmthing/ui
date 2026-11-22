import { createHash } from "node:crypto";
import { expect, it, vi, afterEach } from "vitest";
import { z } from "zod";
import {
  archetypes,
  components,
  defaultLines,
  runComposeProbes,
  runProbes,
  writerFormatFor,
  type Definition,
  type ReplayProbe,
} from "@lmthing/ui/catalog";
import {
  evidenceFingerprint,
  keyOf,
  replayBook,
  recordingCall,
  recordingKey,
  withLegacyEvidence,
  type Book,
} from "./recordings";

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
  const call = recordingCall("model", book, live, true);
  expect(await call("same", 0, undefined, probe)).toBe("failed");
  expect(live).not.toHaveBeenCalled();
  expect(await call("same", 1, undefined, probe)).toBe("fresh");
  expect(await call("changed", 0, undefined, probe)).toBe("fresh");
  expect(await call("same", 0, writerFormatFor(components.List), probe)).toBe("fresh");
  expect(live).toHaveBeenCalledTimes(3);
  expect(await call("same", 0, undefined, probe)).toBe("failed");
  expect(await call("same", 1, undefined, probe)).toBe("fresh");
  expect(live).toHaveBeenCalledTimes(3);
  const changed = { ...probe, definition: { changed: true }, samples: 3 };
  expect(await call("same", 0, undefined, changed)).toBe("failed");
  expect(await call("changed", 0, undefined, changed)).toBe("fresh");
  expect(live).toHaveBeenCalledTimes(3);
  expect(await call("same", 2, undefined, changed)).toBe("fresh");
  expect(await call("same", 1, undefined, changed)).toBe("fresh");
  expect(live).toHaveBeenCalledTimes(4);
  const replay = replayBook("List", "model", book);
  for (const [sample, reply] of ["failed", "fresh", "fresh"].entries())
    expect(await replay("same", sample, undefined, changed)).toBe(reply);
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

it.each([recordingKey("model", "same", undefined, probe), keyOf("model", "same")])(
  "replays reused evidence under a new probe id and preserves the entry at %s",
  async (oldKey) => {
    const book = { [oldKey]: { prompt: "same", reply: "old" } };
    const current = { ...probe, id: "List/choose/see plants" };
    const live = vi.fn(async () => "fresh");
    expect(await recordingCall("model", book, live, true)("same", 0, undefined, current)).toBe("old");
    expect(live).not.toHaveBeenCalled();
    expect(await replayBook("List", "model", book)("same", 0, undefined, current)).toBe("old");
    expect(book[oldKey]).toEqual({ prompt: "same", reply: "old" });
  },
);

it("does not use a legacy alias after the archived reply is replaced under the same request hash", async () => {
  const old = keyOf("model", "same");
  const key = recordingKey("model", "same", undefined, probe);
  const entry = { prompt: "same", reply: "original" };
  const aliases = { [key]: evidenceFingerprint(entry) };
  const verified = replayBook("List", "model", withLegacyEvidence({ [old]: entry }, aliases));
  expect(await verified("same", 0, undefined, probe)).toBe("original");
  const replacement = withLegacyEvidence({ [old]: { ...entry, reply: "replacement" } }, aliases);
  await expect(replayBook("List", "model", replacement)("same", 0, undefined, probe)).rejects.toThrow(
    "No recording",
  );
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

it("uses one complete recording rather than a closer request with partial samples", async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  const partial = "same\nCatalog A";
  const original = "same\nCatalog B";
  const book = {
    [recordingKey("model", partial, undefined, probe)]: { prompt: partial, reply: "partial" },
    [recordingKey("model", original, undefined, probe)]: {
      prompt: original,
      replies: ["first", "second", "third"],
    },
  };
  const replay = replayBook("List", "model", book);
  for (const prompt of [partial, `${partial}\nCatalog C`])
    expect(
      await Promise.all(
        [0, 1, 2].map((sample) => replay(prompt, sample, undefined, { ...probe, samples: 3 })),
      ),
    ).toEqual(["first", "second", "third"]);
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
  [
    "schema refinement",
    { props: list.props.refine((value) => Array.isArray(value.rows) && value.rows.length < 4) },
  ],
  ["metadata", { meta: { ...list.meta, weight: 3 as const } }],
  ["model-facing text", { meta: { ...list.meta, writeHints: ["Changed Writer instruction."] } }],
  ["probe text", { probes: [{ kind: "choose", need: "Find my plants", expect: "List" }] as const }],
])("misses when the probed component's %s changes", async (_label, changes) => {
  const callModel = await recordedChoice();
  await expect(
    runProbes({ defs: [{ ...list, ...changes }, components.Card], only: ["List"], callModel }),
  ).rejects.toThrow("No recording");
});

it("does not invalidate evidence when the component is promoted to ready", async () => {
  const callModel = await recordedChoice();
  const ready: Definition = { ...list, meta: { ...list.meta, status: "ready" } };
  expect(await runProbes({ defs: [ready, components.Card], only: ["List"], callModel })).toMatchObject([
    { status: "pass" },
  ]);
});

it("tolerates composition catalog drift but misses when the layout's own instructions change", async () => {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const meta = archetypes.detail.meta;
  const layout = "facts";
  const cast = { things: [], items: [] };
  const options = { archetypes: [meta], only: [`${meta.id}/${layout}`], cast, samples: 1 };
  const reply = JSON.stringify(defaultLines(meta, layout, cast, components));
  const book: Book = {};
  const live = recordingCall("model", book, async () => reply);
  expect(await runComposeProbes({ ...options, defs: components, callModel: live })).toMatchObject([
    { status: "pass" },
  ]);
  const callModel = replayBook("Archetypes", "model", book);
  const defs = {
    ...components,
    Header: { ...components.Header, meta: { ...components.Header.meta, purpose: "Name the page." } },
  };
  expect(await runComposeProbes({ ...options, defs, callModel })).toMatchObject([{ status: "pass" }]);
  expect(log).toHaveBeenCalledOnce();
  await expect(
    runComposeProbes({ ...options, archetypes: [{ ...meta, purpose: "New layout job." }], defs, callModel }),
  ).rejects.toThrow("No recording");
});
