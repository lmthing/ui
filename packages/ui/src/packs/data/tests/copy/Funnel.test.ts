import { expect, it } from "vitest";
import { funnelLines } from "../../copy";

const stages = (...counts: number[]) => counts.map((count) => ({ label: String(count), count }));

it("scales bars to the entry stage and computes adjacent and overall conversion separately", () => {
  const result = funnelLines({ stages: stages(100, 40, 30, 0), unit: "orders" }, "en");
  expect(result.overall).toBe("Overall conversion: 0%");
  expect(result.stages.map(({ ratio }) => ratio)).toEqual([1, 0.4, 0.3, 0]);
  expect(result.stages.map(({ step }) => step)).toEqual([
    undefined,
    "From previous: 40%",
    "From previous: 75%",
    "From previous: 0%",
  ]);
  expect(result.stages[0]?.count).toBe("100 orders");
});

it("distinguishes an undefined rate from zero and permits counts rising above the entry stage", () => {
  const empty = funnelLines({ stages: stages(0, 5, 0) });
  expect(empty.overall).toBe("Overall conversion: Not available");
  expect(empty.stages.map(({ ratio }) => ratio)).toEqual([0, 0, 0]);
  expect(empty.stages[1]?.step).toBe("From previous: Not available");
  expect(empty.stages[2]?.step).toBe("From previous: 0%");
  const rising = funnelLines({ stages: stages(2, 3) });
  expect(rising.overall).toBe("Overall conversion: 150%");
  expect(rising.stages[1]?.ratio).toBe(1);
});

it("localizes counts, rates and the host currency and distinguishes omitted value from zero", () => {
  const input = {
    stages: [
      { label: "A", count: 2.5, value: 0 },
      { label: "B", count: 1 },
    ],
  };
  const result = funnelLines(input, "de-DE", "EUR");
  expect(result.stages[0]?.count).toBe("2,5");
  expect(result.stages[0]?.value).toMatch(/^0\s€$/);
  expect(result.stages[1]?.value).toBeUndefined();
  expect(result.overall).toMatch(/40\s%$/);
  expect(funnelLines({ ...input, detail: "brief" }).stages[0]?.value).toBeUndefined();
});
