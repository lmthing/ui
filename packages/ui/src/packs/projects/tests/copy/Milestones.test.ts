import { expect, it } from "vitest";
import { milestoneCopies } from "../../copy";

const gate = { title: "Final review", due: "2026-11-20", requires: ["one", "two"] };
const input = { projectRef: "project", gates: [gate], style: "cards", detail: "full" } as const;
const snapshot = (records: readonly unknown[]) => ({ project_deliverables: records });
const one = { projectRef: "project", deliverableRef: "one", title: "Draft", acceptedAt: "2026-11-19" };
const two = { projectRef: "project", deliverableRef: "two", title: "Proof", acceptedAt: "2026-11-23" };
const today = new Date(2026, 10, 22);

it("requires valid records for this project and reaches a gate on the last acceptance date", () => {
  const incomplete = snapshot([one, { ...two, projectRef: "unrelated" }, { ...two, acceptedAt: 0 }]);
  expect(milestoneCopies(input, incomplete, "en-GB", today)[0]).toMatchObject({
    due: "Overdue · 20 Nov 2026",
    missing: "Still needed: two",
    reached: undefined,
  });
  expect(milestoneCopies(input, snapshot([one, two]), "en-GB", new Date(2026, 10, 24))[0]).toMatchObject({
    due: "Due 20 Nov 2026",
    reached: "Reached 23 Nov 2026",
    requires: "Requires: Draft, Proof",
    missing: undefined,
  });
});
