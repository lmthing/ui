import { expect, it } from "vitest";
import { components, readComponent } from "@lmthing/ui/catalog";
import { cycleLabels } from "..";

it("labels the period-log action and keeps the contraception caveat in the reading", () => {
  const reading = readComponent(components.Cycle, components.Cycle.examples[0], "c1").join("\n");
  expect(reading).toContain(cycleLabels.log);
  expect(reading).toContain(cycleLabels.disclaimer);
  expect(reading).toContain("[c1/log press]");
  expect(reading).not.toContain("[c1 press]");
});
