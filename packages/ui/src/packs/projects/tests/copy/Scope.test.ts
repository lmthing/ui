import { expect, it } from "vitest";
import { scopeCanRemove, scopeCopy, scopeLocalDate } from "../../copy";

const input = {
  projectRef: "route",
  revision: 2,
  style: "baseline" as const,
  detail: "full" as const,
  excluded: ["Printing"],
  deliverables: [
    { deliverableRef: "map", title: "Map", acceptance: "Scale marked", due: "2026-11-18" },
    { deliverableRef: "signage", title: "Signs", acceptance: "Route labelled", acceptedAt: "2026-11-18" },
  ],
};
const data = {
  project_calendar: [{ projectRef: "route", date: "2026-11-19", timeZone: "America/New_York" }],
  project_milestones: [
    { projectRef: "route", requires: ["map"] },
    { projectRef: "other", requires: ["signage"] },
  ],
};

it("uses host-local dates, differentiates overdue and accepted, and counts accepted rows", () => {
  expect(scopeLocalDate(Date.parse("2026-11-19T02:00:00Z"), data)).toBe("2026-11-18");
  const copy = scopeCopy(input, "en-GB", data);
  expect(copy.count).toBe("1 of 2");
  expect(copy.rows.map(({ overdue }) => overdue)).toEqual([true, false]);
  expect(copy.rows[0]?.due).toBe("Overdue · 18 Nov 2026");
  expect(copy.rows[1]?.acceptedAt).toBe("Accepted 18 Nov 2026");
  const condensed = scopeCopy({ ...input, detail: "brief" }, "en-GB", data);
  expect(condensed.rows[0]).toMatchObject({ overdue: true, due: undefined });
  expect(condensed.rows[1]?.acceptedAt).toBeUndefined();
  expect(condensed.excluded).toEqual(["Printing"]);
});

it("does not permit removal of a referenced or last deliverable, or at the revision limit", () => {
  expect(scopeCanRemove(input.deliverables[0]!, input, data)).toBe(false);
  expect(scopeCanRemove(input.deliverables[1]!, input, data)).toBe(true);
  expect(
    scopeCanRemove(input.deliverables[1]!, { ...input, deliverables: input.deliverables.slice(1) }, data),
  ).toBe(false);
  expect(scopeCanRemove(input.deliverables[1]!, { ...input, revision: 99 }, data)).toBe(false);
});
