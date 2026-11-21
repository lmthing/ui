import { expect, it } from "vitest";
import { packIndex, type PackMeta } from "../../meta";
import type { PackProbe } from "..";
import { packSelectionProbes, runPackProbes } from "./index";
import { buildPackIndex } from "../../prompt";

it("skips an empty pack index without calling a model", async () => {
  expect(
    await runPackProbes({
      packs: {},
      callModel: async () => {
        throw new Error("called");
      },
    }),
  ).toEqual([]);
});

it("re-scores allowed additions without changing an existing prompt", async () => {
  const probe: PackProbe = { kind: "pack", idea: "Book an appointment", expect: ["booking"] };
  const booking: PackMeta = { id: "booking", example: "example.jsonl", probes: [probe] };
  const prompts: string[] = [];
  const callModel = async (prompt: string, sample = 0) => {
    prompts.push(prompt);
    return sample === 0 ? '["booking"]' : '["booking","customers"]';
  };
  const strict = await runPackProbes({ packs: { booking }, callModel, samples: 3 });
  const allowed = await runPackProbes({
    packs: { booking: { ...booking, probes: [{ ...probe, allow: ["customers"] }] } },
    callModel,
    samples: 3,
  });
  expect(strict[0]).toMatchObject({ status: "fail", score: "1/3" });
  expect(allowed[0]).toMatchObject({ status: "pass", score: "3/3" });
  expect(prompts).toHaveLength(6);
  expect(new Set(prompts).size).toBe(1);
  expect(allowed[0]!.prompt).toBe(strict[0]!.prompt);
});
it("explicitly includes draft packs in the full index and uses majority scoring", async () => {
  const booking: PackMeta = {
    id: "booking",
    example: "example.jsonl",
    probes: [{ kind: "pack", idea: "I need a haircut", expect: ["booking"] }],
  };
  const packs = { booking, commerce: { ...booking, id: "commerce" as const, probes: [] } };
  expect(buildPackIndex(packs)).toBe("");
  const results = await runPackProbes({
    packs,
    only: ["booking"],
    samples: 3,
    callModel: async (prompt, sample) => {
      expect(prompt).toContain(
        `${buildPackIndex(packs, { includeDrafts: true })}\n\nIdea: I need a haircut\nReply with a JSON array of up to 3 pack ids, or [] when none fit.`,
      );
      expect(prompt).toContain("Choose the domain packs this app needs");
      expect(prompt).toContain("commerce:");
      expect(prompt).toContain("I need a haircut");
      return sample === 0 ? "[]" : '["booking"]';
    },
  });
  expect(results[0]).toMatchObject({ status: "pass", score: "2/3" });
});

it.each(packIndex.slice(27))("covers the $id pick and a near miss before scaffolding", ({ id, pick }) => {
  const cases = packSelectionProbes(id);
  const positives = cases.filter((probe) => probe.expect.includes(id));
  const negatives = cases.filter((probe) => !probe.expect.includes(id) && !probe.allow?.includes(id));
  expect(positives.length).toBeGreaterThanOrEqual(2);
  expect(
    negatives.some(({ expect: ids }) =>
      ids.length ? ids.some((other) => new RegExp(`\\b${other}\\b`).test(pick)) : pick.includes("(core)"),
    ),
  ).toBe(true);
  expect(new Set(cases.map(({ idea }) => idea)).size).toBe(cases.length);
});

it("runs planned probes by id and keeps them when a draft scaffold adds its own", async () => {
  const authored = { kind: "pack", idea: "Open an email thread list", expect: ["comms"] } as const;
  const comms = { id: "comms", example: "./example.jsonl", probes: [authored] } satisfies PackMeta;
  const probes = packSelectionProbes("comms");
  const callModel = async (prompt: string) => {
    expect(prompt).toContain("- comms: Direct and workplace communication");
    expect(prompt).toContain("- workspace: Shared cloud files");
    const probe = [...probes, authored].find(({ idea }) => prompt.includes(`\n\nIdea: ${idea}\n`))!;
    return JSON.stringify(probe.expect);
  };
  const before = await runPackProbes({ packs: {}, only: ["comms"], callModel, samples: 3 });
  const after = await runPackProbes({ packs: { comms }, only: ["comms"], callModel, samples: 3 });
  expect(before).toHaveLength(3);
  expect(after.slice(0, before.length)).toEqual(before);
  expect(after.at(-1)?.probe).toEqual(authored);
  expect(after.every(({ score }) => score === "3/3")).toBe(true);
});
