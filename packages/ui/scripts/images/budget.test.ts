import { expect, it } from "vitest";
import { appImageBudget, chargeImageUsd } from "./budget";
import { routes } from "./fixtures";

const [image2, miniLow, miniMedium] = routes;
const accepted = [
  { slot: "app_icon", route: image2, outputTokens: 173 },
  { slot: "hero", route: image2, outputTokens: 107 },
  { slot: "empty_state", route: miniMedium, outputTokens: 1056 },
  { slot: "success", route: miniMedium, outputTokens: 1056 },
  { slot: "error", route: miniLow, outputTokens: 272 },
  { slot: "product", route: miniLow, outputTokens: 272 },
  { slot: "dish", route: miniLow, outputTokens: 272 },
  { slot: "plant", route: miniMedium, outputTokens: 1056 },
  { slot: "pet", route: miniLow, outputTokens: 272 },
  { slot: "place", route: miniMedium, outputTokens: 1568 },
  { slot: "room", route: image2, outputTokens: 107 },
  { slot: "item", route: miniLow, outputTokens: 272 },
  { slot: "media_cover", route: miniMedium, outputTokens: 1056 },
  { slot: "poster", route: miniMedium, outputTokens: 1056 },
  { slot: "step_illustration", route: image2, outputTokens: 107 },
].map((attempt) => ({ ...attempt, inputTokens: 180, outcome: "accepted" as const }));

it("budgets 15 published images plus four rejected generations, including a rejected retry", () => {
  const rejects = new Map([
    ["hero", 2],
    ["empty_state", 1],
    ["plant", 1],
  ]);
  const fixture = accepted.flatMap((attempt) => [
    ...Array.from({ length: rejects.get(attempt.slot) ?? 0 }, () => ({
      ...attempt,
      outcome: "rejected" as const,
    })),
    attempt,
  ]);
  const result = appImageBudget(fixture);
  expect(result).toMatchObject({ attempts: 19, accepted: 15, rejected: 4, regenerations: 4 });
  expect(appImageBudget(accepted).estimatedUsd).toBeCloseTo(0.088044, 6);
  expect(result.rejectedUsd).toBeCloseTo(0.025836, 6);
  expect(result.estimatedUsd).toBeCloseTo(0.11388, 6);
});

it("counts an abandoned rejected slot and reserves for missing usage without treating zero as absent", () => {
  const result = appImageBudget([
    { slot: "badge", outcome: "rejected", route: miniLow, inputTokens: 180, outputTokens: null },
  ]);
  expect(result).toEqual({
    attempts: 1,
    accepted: 0,
    rejected: 1,
    regenerations: 0,
    estimatedUsd: 0.008,
    rejectedUsd: 0.008,
  });
  expect(chargeImageUsd({ usd: 0, reservedUsd: 0.02 })).toBe(0);
});
