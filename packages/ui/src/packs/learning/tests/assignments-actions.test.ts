import { components, planAct, readScreen } from "@lmthing/ui/catalog";
import { expect, it } from "vitest";

const Assignments = components.Assignments;
const screen = { id: "homework", components: [{ id: "a1", c: "Assignments", ...Assignments.examples[0]! }] };
const defs = { Assignments };

it("reads the current submission status after a check without allowing graded work to be unchecked", () => {
  const before = readScreen(screen, defs);
  expect(before).toContain("[a1/r1/done check:todo]");
  expect(before).toContain("graded");
  expect(before).toContain('"A"');
  expect(before).not.toContain("[a1/r2/done");

  const submitted = planAct(
    screen,
    defs,
    {},
    [{ address: "a1/r1/done", action: "check", value: true }],
    null,
  );
  expect(submitted.ok).toBe(true);
  if (submitted.ok) {
    const after = readScreen(screen, defs, submitted.values);
    expect(after).toContain("[a1/r1/done check:done]");
    expect(after).not.toContain("todo");
    expect(after).toContain("graded");
  }
  const graded = planAct(screen, defs, {}, [{ address: "a1/r2/done", action: "check", value: false }], null);
  expect(graded.ok).toBe(false);
});
