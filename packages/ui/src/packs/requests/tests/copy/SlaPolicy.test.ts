import { expect, it } from "vitest";
import { slaProgress, slaReading, validSlaTimes } from "../../copy";

const input = {
  openedAt: "2026-11-22T08:00:00+01:00",
  responseDueAt: "2026-11-22T08:15:00+01:00",
  resolutionDueAt: "2026-11-22T09:00:00+01:00",
};
const now = (utc: string) => Date.parse(`2026-11-22T${utc}Z`);

it("counts down independently and clamps meter progress at the opening and deadline", () => {
  expect(slaProgress(input, now("06:30:00"))).toMatchObject({ ratio: 1, state: "filled" });
  expect(slaProgress(input, now("07:14:59")).response).toBe("pending");
  expect(slaProgress(input, now("07:15:00"))).toMatchObject({ response: "breached", resolution: "pending" });
  expect(slaProgress(input, now("07:30:00"))).toMatchObject({ ratio: 0.5, remaining: 1800000 });
  expect(slaProgress(input, now("08:01:00"))).toMatchObject({
    ratio: 0,
    resolution: "breached",
    state: "error",
  });
});

it("keeps late events breached, accepts exact deadlines and does not invent paused remaining time", () => {
  const complete = { ...input, respondedAt: input.responseDueAt, resolvedAt: input.resolutionDueAt };
  expect(validSlaTimes(complete)).toBe(true);
  expect(slaProgress(complete, now("09:00:00"))).toMatchObject({ ratio: 1, state: "success" });
  expect(slaProgress({ ...complete, respondedAt: "2026-11-22T07:15:01Z" }, now("09:00:00")).state).toBe(
    "error",
  );
  expect(slaProgress({ ...input, paused: true }, now("10:00:00"))).toMatchObject({
    response: "paused",
    resolution: "paused",
    ratio: 0,
  });
  expect(slaReading({ ...input, paused: true }).resolutionText).toBe("Paused");
});
