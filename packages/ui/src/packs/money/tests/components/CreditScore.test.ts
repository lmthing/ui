import { describe, expect, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  stampItemIds,
} from "@lmthing/ui/catalog";

const def = components.CreditScore;
const [example] = def.examples;
const cast = { things: [], items: [] };

describe("CreditScore schema", () => {
  it.each(def.examples)("accepts planned examples", (input) => {
    expect(def.props.safeParse(input).success).toBe(true);
  });
  it.each([
    { score: 299 },
    { score: 851 },
    { score: 600.5 },
    { previousScore: 1000 },
    { updatedAt: "2026-02-30" },
    { factors: example!.factors.slice(0, 3) },
    { factors: Array(7).fill(example!.factors[0]) },
    { bureau: "a".repeat(25) },
    { delta: 1 },
    { color: "#fff" },
  ])("rejects invalid limits and computed props", (patch) => {
    expect(def.props.safeParse({ ...example, ...patch }).success).toBe(false);
  });
  it("accepts both score endpoints and six factors", () => {
    for (const score of [300, 850]) {
      expect(
        def.props.safeParse({ ...example, score, factors: Array(6).fill(example!.factors[0]) }).success,
      ).toBe(true);
    }
  });
});

it("builds valid neutral fallbacks without copying score data from the cast", () => {
  expect(def.fallback({ cast }).bureau).toBe(placeholderTitle(0));
  for (const title of ["Report", "a".repeat(100), 42]) {
    const input = { ...cast, items: [{ id: "bureau", type: "report", title, score: 789, sample: true }] };
    const fallback = def.fallback({ cast: input });
    expect(def.props.safeParse(fallback).success).toBe(true);
    expect(fallback.score).toBe(300);
    expect(fallback.factors).toHaveLength(4);
  }
});

it("offers refresh and only linked factor rows, not loading or error actions", () => {
  const input = stampItemIds(def.meta, def.props.parse(example));
  const offers = (state: "filled" | "empty" | "loading" | "error") =>
    affordancesOf(def.meta, input, "c1", {}, state).map((action) => action.address);
  expect(offers("filled")).toEqual(["c1/refresh", "c1/r1"]);
  expect(offers("empty")).toEqual(["c1/refresh"]);
  expect(offers("loading")).toEqual([]);
  expect(offers("error")).toEqual([]);
});

it("names a core near miss and enters the registry only with a complete pack", () => {
  expect(def.probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Progress" }));
  expect(createRegistry({ packs: ["money"] }).ids.includes("CreditScore")).toBe(packReady("money"));
});
