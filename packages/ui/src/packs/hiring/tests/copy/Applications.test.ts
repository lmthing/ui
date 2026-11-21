import { expect, it } from "vitest";
import { applicationCopy, projectApplications } from "../../copy";

const today = new Date(2027, 3, 13, 16);
const example = { stage: "interview", outcome: "active", next: "Follow up" } as const;

it("sorts overdue then due today without changing the rest or restamping ids", () => {
  const rows = [
    { ...example, id: "r1", nextAt: "2027-04-14" },
    { ...example, id: "r2", nextAt: "2027-04-13" },
    { ...example, id: "r3", nextAt: "2027-04-11" },
    { ...example, id: "r4", nextAt: "2027-04-10", outcome: "withdrawn" as const },
    { ...example, id: "r5", next: undefined },
  ];
  const projected = projectApplications(rows, today);
  expect(projected.map(({ id }) => id)).toEqual(["r3", "r2", "r1", "r4", "r5"]);
  expect(projected.at(-1)).toMatchObject({
    id: "r5",
    next: undefined,
    stage: "interview",
    followUp: "none",
  });
  expect(rows[2]?.next).toBe("Follow up");
});

it("uses local calendar days rather than elapsed hours to format dates and notices", () => {
  expect(
    applicationCopy({ ...example, nextAt: "2027-04-13", lastContact: "2027-04-12" }, "en-GB", today),
  ).toMatchObject({
    due: "Due today",
    lastContact: "Last contact 12 Apr 2027 · 1 day ago",
    nextAt: "By 13 Apr 2027",
  });
  expect(
    applicationCopy({ ...example, nextAt: "2027-04-12", lastContact: "2027-04-11" }, "en-US", today),
  ).toMatchObject({ due: "Overdue", lastContact: "Last contact Apr 11, 2027 · 2 days ago" });
  expect(
    applicationCopy({ ...example, nextAt: "2027-04-12", outcome: "rejected" }, undefined, today).due,
  ).toBeUndefined();
});
