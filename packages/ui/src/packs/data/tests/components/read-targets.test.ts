import { components, readComponent, runProbes, type Definition } from "@lmthing/ui/catalog";
import { expect, it } from "vitest";

it("omits the hidden BulkActions commands when there is no bound selection", () => {
  const { BulkActions } = components;
  expect(readComponent(BulkActions, BulkActions.examples[0], "s1")).toEqual([]);
});

it.each([
  { def: components.BulkActions, target: "source Table", targetOffer: "[source/r1/pick check:done]" },
  { def: components.ChapterList, target: "target Player", targetOffer: "[target/scrubber seek]" },
])(
  "builds the $target and consumer offers through the read probe runner",
  async ({ def, target, targetOffer }) => {
    const definition: Definition = def;
    const probe = definition.probes.find((candidate) => candidate.kind === "read")!;
    const instance = probe.expect.address.split("/")[0]!;
    const offer = `[${probe.expect.address} ${probe.expect.action}]`;
    expect(readComponent(def, def.examples[probe.screen], instance).join("\n")).not.toContain(offer);

    const [result] = await runProbes({
      defs: [{ ...def, probes: [probe] }],
      callModel: async (prompt) => {
        expect(prompt).toContain(target);
        expect(prompt).toContain(targetOffer);
        expect(prompt).toContain(offer);
        return JSON.stringify(probe.expect);
      },
    });
    expect(result?.status).toBe("pass");
  },
);
