import { expect, it } from "vitest";
import { resumeEducationLine, resumeExperienceLine, resumeProjection } from "../../copy";

const old = { role: "Assistant", org: "Harbour Press", start: "2022", end: "2023" };
const latest = { role: "Editor", org: "Trot", start: "2023-08", summary: "Edit the newsletter." };
const input = {
  openToWork: true,
  experience: [old, latest],
  education: [],
  skills: ["Editing", "Reporting", "Planning"],
  location: "North Park",
  cvLabel: "CV",
  editGoto: "edit",
};

it("orders dated roles without changing authored input and derives brief from the same order", () => {
  expect(resumeProjection(input, false, 2).experience).toEqual([latest, old]);
  expect(resumeProjection(input, true, 2)).toMatchObject({
    experience: [{ ...latest, summary: undefined }],
    skills: ["Editing", "Reporting"],
    location: undefined,
    cvLabel: undefined,
    canPreview: false,
    canEdit: true,
    canShare: false,
  });
  expect(input.experience).toEqual([old, latest]);
  expect(
    resumeProjection({ ...input, experience: [{ ...old, start: "Summer ’22" }, latest] }, false, 2)
      .experience[0]?.role,
  ).toBe("Assistant");
});

it("uses localized full dates and keeps authored year and month labels", () => {
  expect(resumeExperienceLine({ ...latest, start: "2023-08-14" }, "en-GB")).toBe(
    "Trot · 14 Aug 2023–Present",
  );
  expect(resumeExperienceLine(old)).toBe("Harbour Press · 2022–2023");
  const school = { credential: "Certificate", school: "North College" };
  expect(resumeEducationLine(school)).toBe("North College");
  expect(resumeEducationLine({ ...school, year: "2023" })).toBe("North College · 2023");
});
