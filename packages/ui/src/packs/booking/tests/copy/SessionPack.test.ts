import { describe, expect, it } from "vitest";
import { projectSessionPack, sessionPackCopy, sessionPackFacts, sessionPackWake } from "../../copy";

const input = {
  packId: "bundle",
  title: "Bundle",
  total: 6,
  used: 2,
  expires: "2026-11-28",
  renewGoto: "renew",
};
const clock = (day: number, hour = 0) => new Date(2026, 10, day, hour).getTime();

describe("SessionPack copy", () => {
  it("treats expiry as inclusive in local time and wakes at each display boundary", () => {
    for (const [now, expected, wake] of [
      [clock(20, 23), "active", clock(21)],
      [clock(21), "soon", clock(29)],
      [clock(28, 23), "soon", clock(29)],
      [clock(29), "expired", undefined],
    ] as const) {
      const facts = sessionPackFacts(input, now);
      expect(facts.expiry).toBe(expected);
      expect(facts.redeemable).toBe(expected !== "expired");
      expect(sessionPackWake({}, input, now)).toBe(wake);
    }
    expect(sessionPackWake({}, {}, clock(21))).toBeUndefined();
  });
  it("formats the same stored date and credit count for the requested locale", () => {
    const facts = sessionPackFacts(input, clock(21));
    expect(sessionPackCopy(input, facts, "filled", "en-US")).toMatchObject({
      amount: "4 of 6",
      badge: "4 left",
      expiry: "Expires soon · Nov 28, 2026",
    });
    expect(sessionPackCopy(input, facts, "filled", "en-GB").expiry).toBe("Expires soon · 28 Nov 2026");
  });
  it("only consumes journaled redemptions and never shows a negative balance", () => {
    const context = { props: input, data: {}, now: clock(21) };
    expect(projectSessionPack({ ...context, journal: ["redeem", "other"] })).toMatchObject({
      used: 3,
      remaining: 3,
      redeemed: true,
    });
    expect(projectSessionPack({ ...context, journal: Array(7).fill("redeem") })).toMatchObject({
      used: 6,
      remaining: 0,
      redeemable: false,
    });
  });
});
