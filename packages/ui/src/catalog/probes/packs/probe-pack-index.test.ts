import { expect, it } from "vitest";
import { z } from "zod";
import { components } from "@lmthing/ui/catalog";
import { probePackIndex } from "./probe-pack-index";
import { packIds, type PackId, type PackMeta } from "../../meta";
import { checkPacks } from "../../rules";
import { runPackProbes } from "./index";

const unscaffolded: Partial<Record<PackId, PackMeta>> = {};

it("offers and scores only indexed packs even when none is scaffolded", () => {
  const index = probePackIndex(unscaffolded);
  expect(index.ids).toEqual(packIds);
  expect(index.prompt).toContain("Pick: Selling things for money:");
  expect(index.prompt.split("\n").map((line) => line.split(":")[0])).toEqual(
    [...index.ids].sort().map((id) => `- ${id}`),
  );
});

it.each(packIds)("adding a %s scaffold leaves the index byte for byte unchanged", (id) => {
  const before = probePackIndex(unscaffolded);
  const scaffold = { id, example: "example.jsonl", probes: [] } satisfies PackMeta;
  expect(probePackIndex({ ...unscaffolded, [id]: scaffold })).toEqual(before);
});

it("validates a Wave 6 scaffold with shared Director probes and only draft components", () => {
  const Inbox = {
    ...components.List,
    meta: { ...components.List.meta, id: "Inbox", status: "draft" as const },
    props: z.strictObject({ title: z.string() }),
  };
  expect(
    checkPacks({
      components: { Inbox },
      packOf: { Inbox: "comms" },
      packs: { comms: { id: "comms", example: "example.jsonl", probes: [] } },
      packArchetypes: {
        comms: ["inbox", "thread"].map((id) => ({ id, job: "Message", layouts: {}, defaultLayout: "plain" })),
      },
      packExamples: { comms: '{"c":"Inbox","title":"Walkers"}' },
    }),
  ).toEqual([]);
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
