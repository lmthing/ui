import { describe, expect, it } from "vitest";
import { pantryDates, pantryOrder, pantryReading, pantryToday } from "../../copy";

describe("Pantry date copy and ordering", () => {
  it.each([
    ["2026-11-18", "Expired", "bad"],
    ["2026-11-19", "Use soon", "warn"],
    ["2026-11-22", "Use soon", "warn"],
    ["2026-11-23", "Use by", "muted"],
    [undefined, "Use-by date", "muted"],
  ] as const)("computes the exact expiry boundary for %s", (date, label, tone) => {
    expect(pantryDates(date, "2026-11-19")).toMatchObject({ label, tone });
  });
  it("handles leap days, year boundaries, local days and absent dates", () => {
    expect(pantryDates("2024-03-01", "2024-02-27").tone).toBe("warn");
    expect(pantryDates("2027-01-02", "2026-12-30").tone).toBe("warn");
    expect(pantryDates("2027-01-03", "2026-12-30").tone).toBe("muted");
    expect(pantryToday(new Date(2026, 0, 2, 23, 59))).toBe("2026-01-02");
    expect(pantryDates()).toMatchObject({ date: "Not set" });
    expect(pantryDates("2024-02-29").date).toBe("29 Feb 2024");
  });
  it("orders dated records first, preserves ties, ids and the input", () => {
    const items = [
      { id: "r1" },
      { id: "r2", useBy: "2026-11-22" },
      { id: "r3", useBy: "2026-11-18" },
      { id: "r4", useBy: "2026-11-22" },
      { id: "r5", useBy: "9999-12-31" },
      { id: "r6" },
    ];
    expect(pantryOrder(items).map((item) => item.id)).toEqual(["r3", "r2", "r4", "r5", "r1", "r6"]);
    expect(items.map((item) => item.id)).toEqual(["r1", "r2", "r3", "r4", "r5", "r6"]);
    expect(pantryOrder([])).toEqual([]);
  });
  it("reads derived labels and stored quantities with stable addresses", () => {
    expect(pantryReading({ items: [{ id: "r2", name: "Item", qty: "2", place: "freezer" }] })).toEqual([
      "r2: Item",
      "2",
      "freezer",
      "Use-by date",
      "Not set",
      "Used up",
    ]);
    expect(pantryReading({ items: [{ name: "Item", qty: "2", place: "fridge" }] })[0]).toBe("Item: Item");
  });
});
