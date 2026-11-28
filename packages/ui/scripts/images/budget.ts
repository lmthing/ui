import type { Route } from "./fixtures";

export const reserveUsd = { "image2-low": 0.02, "mini-low": 0.008, "mini-medium": 0.018 } satisfies Record<
  Route["id"],
  number
>;

export function estimateImageUsd(route: Route, input: number | null, output: number | null) {
  return input === null || output === null
    ? null
    : (input * route.textRate + output * route.imageRate) / 1_000_000;
}

export function chargeImageUsd({ usd, reservedUsd }: { usd: number | null; reservedUsd?: number }) {
  return usd ?? reservedUsd ?? Math.max(...Object.values(reserveUsd));
}

type Attempt = {
  slot: string;
  outcome: "rejected" | "accepted";
  route: Route;
  inputTokens: number | null;
  outputTokens: number | null;
};

/** Count every billable generation, not just the asset eventually published. */
export function appImageBudget(attempts: readonly Attempt[]) {
  const seen = new Set<string>();
  const accepted = new Set<string>();
  let rejected = 0;
  let regenerations = 0;
  let estimatedUsd = 0;
  let rejectedUsd = 0;
  for (const { slot, outcome, route, inputTokens, outputTokens } of attempts) {
    if (accepted.has(slot)) throw new Error(`Unexpected generation after acceptance: ${slot}`);
    if (seen.has(slot)) regenerations++;
    seen.add(slot);
    const charge = chargeImageUsd({
      usd: estimateImageUsd(route, inputTokens, outputTokens),
      reservedUsd: reserveUsd[route.id],
    });
    estimatedUsd += charge;
    if (outcome === "accepted") accepted.add(slot);
    else {
      rejected++;
      rejectedUsd += charge;
    }
  }
  return {
    attempts: attempts.length,
    accepted: accepted.size,
    rejected,
    regenerations,
    estimatedUsd,
    rejectedUsd,
  };
}
