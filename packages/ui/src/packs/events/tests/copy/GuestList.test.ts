import { describe, expect, it } from "vitest";
import { groupGuests, guestFacts, guestListReading, guestStats } from "../../copy";

const base = { name: "Reed", status: "waiting", plus: 0 } as const;
const guests = [
  { ...base, id: "r1" },
  { ...base, name: "Robin", id: "r2", party: "Reed", diet: "Vegan", plus: 3 },
  { ...base, id: "r3", status: "no" },
  { ...base, name: "Gail", id: "r4", party: "Reed", status: "yes" },
] as const;

describe("GuestList copy", () => {
  it("keeps different solo guests separate and groups only explicit parties", () => {
    expect(groupGuests(guests).map(({ party, rows }) => [party, rows.map(({ id }) => id)])).toEqual([
      [undefined, ["r1"]],
      ["Reed", ["r2", "r4"]],
      [undefined, ["r3"]],
    ]);
  });

  it("counts invitation replies, not plus-ones, and preserves the original group read format", () => {
    expect(guestStats(guests).map(({ line }) => line)).toEqual([
      "1 Coming",
      "1 Declined",
      "0 Maybe",
      "2 Waiting",
    ]);
    expect(guestListReading({ guests }, "filled").slice(1)).toEqual([
      "Reed: Reed · waiting",
      "Reed: Robin +3 · waiting · Vegan; Gail · yes",
      "Reed: Reed · no",
    ]);
    expect(guestFacts(guests[1], "brief")).toMatchObject({ plus: "+3", status: "Waiting", diet: undefined });
    expect(guestListReading({ guests, detail: "brief" }, "filled").join()).not.toContain("Vegan");
  });
});
