import { expect, it } from "vitest";
import { projectStatusCopy, projectStatusReading } from "../../copy";

const snapshot = {
  projectRef: "folio",
  headline: "Design is ready",
  status: "on_track",
  updatedAt: "2028-02-28",
  wins: ["Mobile design approved"],
  blockers: ["Copy pending"],
  nextMilestone: { title: "Sign-off", due: "2028-03-01" },
  detail: "full",
} as const;
const input = { ...snapshot, wins: [...snapshot.wins], blockers: [...snapshot.blockers] };
const data = (date: string) => ({
  project_calendar: [
    { projectRef: "folio", date: "wrong" },
    { projectRef: "other", date: "2028-03-05" },
    { projectRef: "folio", date },
  ],
});

it("maps stored health to semantic tones and computes remaining calendar days by project", () => {
  expect(projectStatusCopy(input, "en", data("2028-02-28"))).toMatchObject({
    status: "On track",
    tone: "good",
    milestoneDate: "1 Mar 2028",
    remaining: "2 days left",
  });
  expect(projectStatusCopy({ ...input, status: "at_risk" }, "en", data("2028-02-29"))).toMatchObject({
    status: "At risk",
    tone: "warn",
    remaining: "1 day left",
  });
  expect(projectStatusCopy({ ...input, status: "blocked" }, "en", data("2028-03-01"))).toMatchObject({
    status: "Blocked",
    tone: "bad",
    remaining: "Today",
  });
  expect(projectStatusCopy(input, "en", data("2028-03-02")).remaining).toBeUndefined();
  expect(projectStatusCopy(input, "en", undefined, new Date(2028, 1, 29, 12)).remaining).toBe("1 day left");
});

it("uses the requested date locale and does not read filled copy in other states", () => {
  expect(projectStatusCopy(input, "fr-FR", data("2028-02-28")).updated).toBe("28 févr. 2028");
  expect(projectStatusReading(input, "filled", "en", data("2028-02-28"))).toEqual([
    "On track · Design is ready · 28 Feb 2028",
    "Wins: Mobile design approved",
    "Blockers: Copy pending",
    "Next milestone: Sign-off · 1 Mar 2028 · 2 days left",
  ]);
  expect(projectStatusReading(input, "empty")).toEqual([]);
  expect(projectStatusReading(input, "loading")).toEqual([]);
});
