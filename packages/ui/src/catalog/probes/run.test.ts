import { expect, it } from "vitest";
import {
  components,
  runProbes,
  writerFormatFor,
  choosePrompt,
  readPrompt,
  type WriterFormat,
} from "@lmthing/ui/catalog";

it("formats every write sample only, leaving choose/read prompts and sample numbers unchanged", async () => {
  const calls: { prompt: string; sample: number | undefined; format: WriterFormat | undefined }[] = [];
  const def = {
    ...components.List,
    probes: [
      { kind: "choose" as const, need: "Things to browse", expect: "List" },
      { kind: "write" as const, brief: "Things to browse", expect: "List" },
      {
        kind: "read" as const,
        screen: 0,
        task: "Mark Fern as watered",
        expect: { address: "l1/r1/trail", action: "toggle" },
      },
    ],
  };
  const results = await runProbes({
    defs: [def],
    samples: 3,
    callModel: async (prompt, sample, format) => {
      calls.push({ prompt, sample, format });
      return format
        ? '{"c":"List","rows":[{"title":"Fern"}]}'
        : prompt.startsWith("You choose")
          ? "List"
          : '{"address":"l1/r1/trail","action":"toggle"}';
    },
  });
  expect(results.every((result) => result.status === "pass")).toBe(true);
  expect(calls.map((call) => call.sample)).toEqual([0, 1, 2, 0, 1, 2, 0, 1, 2]);
  expect(calls.slice(3, 6).map((call) => call.format)).toEqual(Array(3).fill(writerFormatFor(def)));
  expect(calls[0]?.prompt).toBe(choosePrompt([def], "Things to browse"));
  expect(calls[6]?.prompt).toBe(readPrompt(def, 0, "l1", "Mark Fern as watered"));
  expect([...calls.slice(0, 3), ...calls.slice(6)].every((call) => call.format === undefined)).toBe(true);
});
