import { describe, expect, it } from "vitest";
import { splitBalances, splitCopy, splitPayments, splitReading } from "../../copy";

describe("Split calculation", () => {
  it("rounds each expense once and preserves every cent of an uneven split", () => {
    const balances = splitBalances(3, [{ amount: 10.075, by: 2 }]);
    expect(balances).toEqual([-336n, -336n, 672n]);
    expect(splitBalances(3, [{ amount: 0.01, by: 1 }])).toEqual([-1n, 1n, 0n]);
    expect(splitBalances(2, [{ amount: 0.004, by: 0 }])).toEqual([0n, 0n]);
    expect(splitBalances(2, [{ amount: 1e-7, by: 0 }])).toEqual([0n, 0n]);
    expect(splitBalances(2, [{ amount: Number.MAX_VALUE, by: 0 }]).reduce((sum, n) => sum + n)).toBe(0n);
  });

  it("finds the fewest transfers even when pairing the biggest balances first would use more", () => {
    const balances = [-800n, -700n, -500n, 1_200n, 800n];
    const plan = splitPayments(balances);
    expect(plan).toHaveLength(3);
    const remaining = [...balances];
    for (const { from, to, cents } of plan) {
      expect(cents).toBeGreaterThan(0n);
      expect(remaining[from]).toBeLessThanOrEqual(-cents);
      expect(remaining[to]).toBeGreaterThanOrEqual(cents);
      remaining[from] = remaining[from]! + cents;
      remaining[to] = remaining[to]! - cents;
    }
    expect(remaining).toEqual([0n, 0n, 0n, 0n, 0n]);
    expect(splitPayments([0n, 0n])).toEqual([]);
  });

  it("groups multiple payees under the debtor and uses locale-formatted amounts in the reading", () => {
    const input = {
      people: [{ name: "A" }, { name: "B" }, { name: "C" }],
      expenses: [
        { title: "First", amount: 3.75, by: 0 },
        { title: "Second", amount: 3.75, by: 1 },
      ],
    };
    const grouped = splitCopy(input, "de-DE").settlements;
    expect(grouped).toMatchObject([{ from: 2, payments: [{ to: 0, amount: "1,25 $" }, { to: 1 }] }]);
    expect(splitReading(input, "de-DE")).toContain("C pays A 1,25 $");
  });
});
