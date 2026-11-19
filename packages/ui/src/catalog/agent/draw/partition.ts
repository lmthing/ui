import { randomIndex, type RandomSource } from "./random";

type Partition = {
  locked: readonly (number | undefined)[];
  sizes: number[];
  eligible: number[];
  extra: number;
};

export function partitionPlan(locks: readonly unknown[], teams: number): Partition | undefined {
  if (!Number.isInteger(teams) || teams < 1 || teams > locks.length) return;
  const base = Math.floor(locks.length / teams);
  const max = Math.ceil(locks.length / teams);
  const sizes = Array<number>(teams).fill(0);
  const locked: (number | undefined)[] = [];
  for (const lock of locks) {
    if (lock === undefined) locked.push(undefined);
    else {
      if (typeof lock !== "number" || !Number.isInteger(lock) || lock < 0 || lock >= teams) return;
      const count = sizes[lock]! + 1;
      if (count > max) return;
      sizes[lock] = count;
      locked.push(lock);
    }
  }
  const eligible = sizes.flatMap((size, team) => (size <= base ? [team] : []));
  const extra = (locks.length % teams) - (teams - eligible.length);
  if (extra < 0) return;
  return { locked, sizes: sizes.map((size) => Math.max(size, base)), eligible, extra };
}

export function drawPartition(plan: Partition, random: RandomSource): number[] {
  const { locked, eligible, extra } = plan;
  const capacities = [...plan.sizes];
  const candidates = [...eligible];
  // Pick the extra-capacity teams uniformly from those not forced by locks.
  for (let i = 0; i < extra; i++) {
    const team = candidates.splice(randomIndex(candidates.length, random), 1)[0]!;
    capacities[team] = capacities[team]! + 1;
  }
  for (const team of locked) if (team !== undefined) capacities[team] = capacities[team]! - 1;
  const seats = capacities.flatMap((size, team) => Array<number>(size).fill(team));
  // A uniformly shuffled roster in the open slots is equivalent to drawing slots without replacement.
  return locked.map((team) => {
    if (team !== undefined) return team;
    const index = randomIndex(seats.length, random);
    const picked = seats[index]!;
    const last = seats.pop()!;
    if (index < seats.length) seats[index] = last;
    return picked;
  });
}
