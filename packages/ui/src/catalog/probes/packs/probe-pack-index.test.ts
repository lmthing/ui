import { expect, it } from "vitest";
import { probePackIndex } from "./probe-pack-index";
import { packs } from "@lmthing/ui/catalog";
import { packIds, type PackId, type PackMeta } from "../../meta";
import { runPackProbes } from "./index";

it("includes every planned pack without registering unscaffolded choices", () => {
  const index = probePackIndex(packs);
  expect(index.ids).toContain("commerce");
  expect(index.ids).toEqual(packIds);
  expect(index.prompt).toContain("Pick: Selling things for money:");
  expect(index.prompt.split("\n")).toHaveLength(packIds.length);
  expect(packs).not.toHaveProperty("commerce");
});

it.each(packIds)("adding a %s scaffold leaves the index byte for byte unchanged", (id) => {
  const before = probePackIndex(packs);
  const scaffold = { id, example: "example.jsonl", probes: [] } satisfies PackMeta;
  expect(probePackIndex({ ...packs, [id]: scaffold })).toEqual(before);
  expect(probePackIndex({})).toEqual(before);
});

it("adding every remaining scaffold leaves an existing Director probe prompt unchanged", async () => {
  const prompts: string[] = [];
  const booking: PackMeta = {
    id: "booking",
    example: "example.jsonl",
    probes: [{ kind: "pack", idea: "Book an appointment", expect: ["booking"] }],
  };
  const scaffolds: Partial<Record<PackId, PackMeta>> = { booking };
  const callModel = async (prompt: string) => {
    prompts.push(prompt);
    return '["booking"]';
  };
  await runPackProbes({ packs: scaffolds, only: ["booking"], callModel });
  for (const id of packIds.filter((id) => id !== "booking")) {
    scaffolds[id] = { id, example: "example.jsonl", probes: [] };
    await runPackProbes({ packs: scaffolds, only: ["booking"], callModel });
  }
  expect(prompts).toHaveLength(packIds.length);
  expect(new Set(prompts).size).toBe(1);
});
