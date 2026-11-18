import { expect, it } from "vitest";
import type { PackMeta } from "../../meta";
import { runPackProbes } from "./index";
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
it("explicitly includes draft packs in the full index and uses majority scoring", async () => {
  const booking: PackMeta = {
    id: "booking",
    name: "Booking",
    purpose: "Book time",
    pick: "Not commerce",
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
