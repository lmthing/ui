import { describe, expect, it } from "vitest";
import { memberFacts } from "../../copy";

const row = {
  id: "r1",
  memberId: "ana",
  roles: ["Secretary", "Plot steward", "Volunteer"],
  votingRights: true,
  joined: "2024-03-12",
};

describe("Members copy", () => {
  it("formats membership dates, roles and voting rights in the current language", () => {
    expect(memberFacts(row, {})).toMatchObject({
      joined: "Joined 12 Mar 2024",
      voting: "Can vote",
      otherRoles: "Plot steward and Volunteer",
    });
    expect(memberFacts(row, {}, "en-US").joined).toBe("Joined Mar 12, 2024");
    expect(memberFacts({ ...row, votingRights: false }, {}).voting).toBe("No voting rights");
  });

  it("distinguishes absent, paid and outstanding host balances", () => {
    const malformed = [
      { memberId: "cal", outstanding: 0 },
      { memberId: "ana", outstanding: -1 },
    ];
    expect(memberFacts(row, { member_dues: malformed }).dues).toBeUndefined();
    const paid = { memberId: "ana", outstanding: 0 };
    expect(memberFacts(row, { member_dues: [paid] }).dues).toEqual({ tone: "good", label: "Dues paid" });
    const owed = { memberId: "ana", outstanding: 12 };
    expect(memberFacts(row, { member_dues: [paid, owed] }).dues).toEqual({ tone: "warn", label: "Dues due" });
  });
});
