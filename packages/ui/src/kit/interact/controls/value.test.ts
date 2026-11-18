import { expect, it } from "vitest";
import { components, type Values, type ActStep, type ScreenLike } from "@lmthing/ui/catalog";
import { controlStep } from "../index";
function value(c: keyof typeof components, raw: Values, step: ActStep) {
  if (c === "Composer") raw = { hint: "Reply", ...raw };
  const entry = { id: "c1", c, ...raw };
  const screen: ScreenLike = { id: "test", components: [entry] };
  return controlStep(screen, entry, components[c]!.props.parse(raw) as Values, components, {}, step, 1000);
}
it("rejects unsafe counter values and keeps fixed steps", () => {
  expect(
    value("Counter", { label: "Count", value: 2, step: 3 }, { address: "c1/plus", action: "increment" })
      .value,
  ).toBe(5);
  expect(
    value("Counter", { label: "Count", value: 2, step: 3 }, { address: "c1/minus", action: "decrement" }),
  ).toMatchObject({ disabled: true, values: {} });
});
it("enforces composer limits and clears exact, nonempty sends", () => {
  expect(
    value("Composer", { max: 600 }, { address: "c1/field", action: "type", value: "a".repeat(601) }),
  ).toMatchObject({ error: "The text is over this composer limit", values: {} });
  expect(value("Composer", { value: "  " }, { address: "c1/send", action: "send" })).toMatchObject({
    disabled: true,
    values: {},
  });
  expect(value("Composer", { value: " Exact\n" }, { address: "c1/send", action: "send" })).toMatchObject({
    values: { "test/c1/field": "" },
    send: { text: " Exact\n", address: "test/c1/field" },
  });
});
it("rejects contradictory scale levels and stages timer start/stop data", () => {
  expect(value("Scale", { label: "Level" }, { address: "c1/l1", action: "select", value: 5 })).toMatchObject({
    error: "Choose an editable level from one to five",
    values: {},
  });
  for (const action of ["start", "stop"])
    expect(
      value("Timer", { label: "Elapsed", style: "up", seconds: 10 }, { address: `c1/${action}`, action })
        .values,
    ).toMatchObject({
      "test/c1/$timer": { running: action === "start", from: 1000, seconds: 10 },
      "test/c1/$seconds": 10,
    });
});
