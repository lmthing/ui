import { describe, expect, it } from "vitest";
import { transactionAmount, transactionDay, transactionGroups, transactionReading } from "../../copy";
import { moneyWordsFor, registerMoneyWords } from "../../lang";

describe("Transaction copy", () => {
  it("collates noncontiguous dates newest first without mutating entries or changing ids", () => {
    const first = { date: "2026-11-01", id: "r1" };
    const second = { date: "2026-11-03", id: "r2" };
    const third = { date: "2026-11-03", id: "r3" };
    const fourth = { date: "2026-11-01", id: "r4" };
    const rows = Object.freeze([first, second, third, fourth]);
    expect(transactionGroups(rows)).toEqual([
      { date: second.date, entries: [second, third] },
      { date: first.date, entries: [first, fourth] },
    ]);
  });

  it("handles relative dates across year boundaries and formats old dates with the supplied locale", () => {
    const now = new Date(2027, 0, 1, 0, 10);
    expect(transactionDay("2027-01-01", undefined, now)).toBe("Today");
    expect(transactionDay("2026-12-31", undefined, now)).toBe("Yesterday");
    expect(transactionDay("2026-11-03", undefined, now)).toBe("Tue 3 Nov");
    expect(transactionDay("2026-11-03", "de-DE", now)).toBe("Di., 3. Nov.");
  });

  it("reads grouped and signed amounts using the pack language and locale", () => {
    const original = moneyWordsFor();
    const unregister = registerMoneyWords("de-DE", {
      transactions: { ...original.transactions, today: "Heute", yesterday: "Gestern" },
    });
    try {
      const rows = [
        { id: "r1", date: "2026-12-31", payee: "A", category: "B", amount: -24.5 },
        { id: "r2", date: "2027-01-01", payee: "C", category: "D", amount: 8 },
      ];
      expect(transactionReading(rows, "de-DE", new Date(2027, 0, 1, 12))).toEqual([
        "Heute",
        "r2 C · D · +8\u00a0$",
        "Gestern",
        "r1 A · B · -24,50\u00a0$",
      ]);
    } finally {
      unregister();
    }
  });

  it("keeps zero unsigned, ordinary amounts exact and extreme amounts compact", () => {
    expect(transactionAmount(-0)).toBe("$0");
    expect(transactionAmount(99999.95)).toBe("+$99,999.95");
    expect(transactionAmount(-Number.MAX_VALUE)).toBe("-$1.8E308");
  });
});
