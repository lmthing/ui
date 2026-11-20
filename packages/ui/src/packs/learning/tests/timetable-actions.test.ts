import { components, planAct, readComponent } from "@lmthing/ui/catalog";
import { expect, it } from "vitest";

it("accepts only scheduled weekdays for the timetable picker and reads the saved selection", () => {
  const timetable = components.Timetable;
  const input = timetable.examples[0]!;
  const screen = { id: "schedule", components: [{ id: "t1", c: "Timetable", ...input }] };
  const select = (value: string) =>
    planAct(screen, { Timetable: timetable }, {}, [{ address: "t1/day", action: "select", value }], null);
  expect(select("tue").ok).toBe(false);
  expect(select("banana").ok).toBe(false);
  const valid = select("wed");
  expect(valid.ok).toBe(true);
  if (valid.ok) {
    const values = { "t1/$selected_day": valid.values["schedule/t1/$selected_day"] };
    expect(readComponent(timetable, input, "t1", "filled", values).join("\n")).toContain(
      '[t1/day select = "wed"; choices ["mon","wed"]]',
    );
    const updated = timetable.examples[1]!;
    expect(readComponent(timetable, updated, "t1", "filled", values).join("\n")).toContain(
      '[t1/day select choices ["tue","thu"]]',
    );
    const next = { ...screen, components: [{ id: "t1", c: "Timetable", ...updated }] };
    expect(
      planAct(
        next,
        { Timetable: timetable },
        valid.values,
        [{ address: "t1/day", action: "select", value: "thu" }],
        null,
      ).ok,
    ).toBe(true);
  }
});
