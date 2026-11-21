import { expect, it } from "vitest";
import { interviewCopy, interviewReading } from "../../copy";

const input = {
  date: "2027-12-31",
  time: "23:50",
  minutes: 30,
  format: "video",
  status: "confirmed",
  link: "https://example.test/meeting",
  interviewers: ["Jo", "Ari", "Ruth"],
} as const;

it("formats the wall time across midnight and the year boundary", () => {
  expect(interviewCopy(input, "en-GB", new Date(2027, 11, 31, 23, 55))).toMatchObject({
    date: "31 Dec 2027",
    time: "23:50–00:20 next day",
    duration: "30 min",
    interviewers: "With Jo, Ari and Ruth",
    past: undefined,
  });
});

it("uses the local date for the past notice without changing confirmation", () => {
  const tomorrow = new Date(2028, 0, 1);
  expect(interviewCopy(input, "en-US", tomorrow)).toMatchObject({
    date: "Dec 31, 2027",
    status: "Confirmed",
    past: "Meeting date passed",
  });
  expect(interviewCopy({ ...input, status: "cancelled" }, "en-US", tomorrow).past).toBeUndefined();
  expect(interviewReading(input)).toContain("Join call");
  expect(interviewReading(input).join(" ")).not.toContain(input.link);
});
