import { expect, it } from "vitest";
import { groupSeating, seatInitials, seatingCount, seatingReading } from "../../copy";

it("uses the first two name initials and localizes the result", () => {
  expect(seatInitials("  Émilie   de León ")).toBe("ÉD");
  expect(seatInitials("ipek", "tr")).toBe("İ");
  expect(seatInitials("李")).toBe("李");
});

it("groups by live assignment while retaining original addresses, even for namesakes", () => {
  const entries = [
    { id: "r1", kind: "table", label: "Oak", shape: "round", seats: 8, disclosure: ["Oak"] },
    { id: "r3", kind: "guest", name: "Robin", at: null },
    { id: "r5", kind: "guest", name: "Robin", at: 0 },
  ] as const;
  const { tables, unseated } = groupSeating(entries);
  expect(tables[0]?.guests.map(({ id }) => id)).toEqual(["r5"]);
  expect(unseated.map(({ id }) => id)).toEqual(["r3"]);
  const lang = "ar-u-nu-arab";
  expect(seatingCount(1, 8, lang)).toBe("١ of ٨ seats filled");
  const full = seatingReading({ entries }, "filled", lang);
  const brief = seatingReading({ entries, detail: "brief" }, "filled", lang);
  expect(full).toContain("١ of ٨ seats filled");
  expect(brief).not.toContain("١ of ٨ seats filled");
  expect(seatingReading({ entries }, "empty")).toEqual([]);
});
