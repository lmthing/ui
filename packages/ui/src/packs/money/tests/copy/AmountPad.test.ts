import { describe, expect, it } from "vitest";
import { amountPadKeys, amountPadReading, amountPadText } from "../../copy";
import { moneyWordsFor, registerMoneyWords } from "../../lang";

describe("AmountPad copy", () => {
  it.each([
    [undefined, ""],
    ["", ""],
    [24.5, "24.5"],
    [-0, "0"],
    [1000, "1000"],
    [1e-7, "0.0000001"],
    ["24.50", "24.50"],
    ["24.", "24."],
  ])("formats %s as exact keypad text", (value, expected) => {
    expect(amountPadText(value)).toBe(expected);
  });

  it("uses stable keys and localizes labels without changing wire edits", () => {
    const en = moneyWordsFor();
    const words = { ...en.amountPad, decimal: ",", backspace: "Effacer", note: "Ajouter une note" };
    const unregister = registerMoneyWords("fr", { ...en, amountPad: words });
    try {
      const keys = amountPadKeys(words);
      expect(new Set(keys.map(({ id }) => id)).size).toBe(12);
      expect(keys.map(({ value }) => value)).toEqual([
        ..."123456789.0".split("").map((append) => ({ append })),
        { backspace: true },
      ]);
      expect(amountPadReading({ value: "25.00", note: true }, "fr")).toEqual([
        "25.00",
        "1 2 3 4 5 6 7 8 9 , 0 Effacer",
        "Ajouter une note",
      ]);
      expect(amountPadReading({ value: "", note: false })).toEqual(["1 2 3 4 5 6 7 8 9 . 0 Delete"]);
    } finally {
      unregister();
    }
  });
});
