import { describe, expect, it } from "vitest";
import { dateCells, dateMatrix, dateMatrixReading, projectDateViewer } from "../../copy";

const dates = [
  { date: "2027-04-09", time: "18:30" },
  { date: "2027-04-09", time: "19:00" },
];

describe("FindDate copy and projection", () => {
  it("ranks by yes, then maybe, then candidate order, with no winner when no one can attend", () => {
    const compare = (answers: ("yes" | "maybe" | "no" | "none")[][]) =>
      dateMatrix({ dates, cells: dateCells(answers.map((row) => ({ name: "Guest", answers: row }))) });
    expect(compare([["no", "none"]])).toMatchObject({ bestColumn: undefined, title: "No date leads yet" });
    expect(compare([["maybe", "maybe"]])).toMatchObject({ bestColumn: 0, count: "0 yes · 1 maybe" });
    expect(
      compare([
        ["maybe", "yes"],
        ["maybe", "no"],
      ]),
    ).toMatchObject({
      bestColumn: 1,
      count: "1 yes · 0 maybe",
    });
    expect(
      compare([
        ["yes", "yes"],
        ["no", "maybe"],
      ]),
    ).toMatchObject({ bestColumn: 1 });
  });

  it("formats dates and times locally and distinguishes time slots on the same day", () => {
    const cells = dateCells([{ name: "Mara", answers: ["none", "yes"] }]);
    const result = dateMatrix({ dates, cells }, "fr-FR");
    expect(result.slots.map(({ label }) => label)).toEqual(["9 avr. 2027 · 18:30", "9 avr. 2027 · 19:00"]);
    expect(result.title).toBe("Best fit: 9 avr. 2027 · 19:00");
  });

  it("keeps namesakes on distinct addressed rows and reads only the bound cells as editable", () => {
    const people = [
      { name: "Lee", answers: ["yes", "none"] as ["yes", "none"] },
      { name: "Lee", answers: ["no", "maybe"] as ["no", "maybe"] },
    ];
    const cells = dateCells(people).map((cell, index) => ({ ...cell, id: `r${index + 1}` }));
    const input = { dates, people, cells };
    const { cells: projected } = projectDateViewer(input, "f1", {
      eventViewer: [{ instance: "f1", row: 1 }],
    });
    expect(projected.map(({ id, own }) => [id, own])).toEqual([
      ["r1", false],
      ["r2", false],
      ["r3", true],
      ["r4", true],
    ]);
    const reading = dateMatrixReading({ ...input, cells: projected }, "filled");
    expect(reading).toContain("Lee: Yes · No reply");
    expect(reading).toContain("Lee: No · Maybe");
    expect(reading.filter((line) => /^r\d:/.test(line))).toEqual([
      "r3: Lee, 9 Apr 2027 · 18:30",
      "r4: Lee, 9 Apr 2027 · 19:00",
    ]);
  });
});
