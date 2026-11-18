import { expect, it } from "vitest";
import type { PackMeta } from "../../meta";
import { runPackProbes } from "./index";

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
it("uses the full index and majority scoring with sample keys", async () => {
  const booking: PackMeta = {
    id: "booking",
    name: "Booking",
    purpose: "Book time",
    pick: "Not commerce",
    example: "example.jsonl",
    probes: [{ kind: "pack", idea: "I need a haircut", expect: ["booking"] }],
  };
  const results = await runPackProbes({
    packs: { booking, commerce: { ...booking, id: "commerce", probes: [] } },
    only: ["booking"],
    samples: 3,
    callModel: async (prompt, sample) => {
      expect(prompt).toContain("commerce:");
      expect(prompt).toContain("I need a haircut");
      return sample === 0 ? "[]" : '["booking"]';
    },
  });
  expect(results[0]).toMatchObject({ status: "pass", score: "2/3" });
});
