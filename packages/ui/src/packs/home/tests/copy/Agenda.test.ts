import { expect, it } from "vitest";
import { agendaLabels } from "../../copy";

it("keeps the add-event action unchanged", () => {
  expect(agendaLabels).toEqual({ add: "Add event" });
});
