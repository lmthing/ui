import { expect, it } from "vitest";
import { components, readComponent } from "@lmthing/ui/catalog";

it("retains authored place and coworkers while hiding them from the brief reading", () => {
  const shift = {
    date: "2026-11-21",
    from: "08:00",
    to: "13:00",
    role: "Park walks",
    place: "Riverside",
    with: "Sam",
    status: "confirmed",
  };
  const brief = { ...shift, detail: "brief" };
  expect(components.Shift.props.parse(brief)).toMatchObject({ place: "Riverside", with: "Sam" });
  const read = (input: unknown) => readComponent(components.Shift, input, "s1").join("\n");
  expect(read(shift)).toContain('"Riverside"');
  expect(read(shift)).toContain('"Sam"');
  expect(read(brief)).not.toContain('"Riverside"');
  expect(read(brief)).not.toContain('"Sam"');
  expect(read(brief)).toContain('"Park walks"');
  expect(read(brief)).toContain("[s1/swap press !needs-people]");
});
