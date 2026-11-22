import { expect, it } from "vitest";
import { projectBriefCopy, projectBriefReading } from "../../copy";

const dates = { owner: "Jo Lee", start: "2028-02-28", target: "2028-03-01", detail: "full" } as const;

it("formats all date combinations, using the requested locale", () => {
  expect(projectBriefCopy(dates, "en")).toEqual({
    owner: "Owner: Jo Lee",
    window: "Delivery: 28 Feb 2028 – 1 Mar 2028",
  });
  expect(projectBriefCopy(dates, "fr-FR").window).toBe("Delivery: 28 févr. 2028 – 1 mars 2028");
  expect(projectBriefCopy({ ...dates, target: undefined }).window).toBe("Starts 28 Feb 2028");
  expect(projectBriefCopy({ ...dates, start: undefined }).window).toBe("Target: 1 Mar 2028");
  expect(projectBriefCopy({ ...dates, start: dates.target }).window).toBe("Target: 1 Mar 2028");
  expect(projectBriefCopy({ detail: "full" })).toEqual({ owner: undefined, window: undefined });
  expect(projectBriefCopy({ ...dates, detail: "brief" }).window).toBe("Target: 1 Mar 2028");
  expect(projectBriefCopy({ ...dates, detail: "brief", target: undefined }).window).toBeUndefined();
});

it("reads only visible copy", () => {
  const brief = {
    ...dates,
    title: "Gallery exhibit",
    objective: "Light six prints",
    sections: [{ heading: "Setup", body: "Use the existing rails" }],
    links: [{ label: "Gallery layout" }],
    editGoto: "brief_edit",
  };
  expect(projectBriefReading(brief, "filled")).toEqual([
    "Gallery exhibit",
    "Light six prints",
    "Owner: Jo Lee",
    "Delivery: 28 Feb 2028 – 1 Mar 2028",
    "Setup: Use the existing rails",
    "Resources",
    "Edit brief",
  ]);
  expect(projectBriefReading({ ...brief, detail: "brief" }, "filled")).toEqual([
    "Gallery exhibit",
    "Light six prints",
    "Owner: Jo Lee",
    "Target: 1 Mar 2028",
  ]);
  expect(projectBriefReading(brief, "empty")).toEqual(["No project brief yet"]);
  expect(projectBriefReading(brief, "loading")).toEqual([]);
});
