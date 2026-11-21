import { describe, expect, it } from "vitest";
import { buildEntry, components, readComponent } from "@lmthing/ui/catalog";

const { Dividends, InvestmentActivity, Performance } = components;

describe("offset timestamps", () => {
  const earlier = "2026-01-01T00:00:00.0001Z";
  const later = "2026-01-01T01:00:00.0002+01:00";
  it("accepts distinct ordered sub-millisecond samples", () => {
    const input = Performance.examples[0]!;
    const samples = [
      { at: earlier, quotes: [] },
      { at: later, quotes: [] },
    ];
    expect(Performance.props.safeParse({ ...input, samples }).success).toBe(true);
    expect(Performance.props.safeParse({ ...input, samples: [...samples].reverse() }).success).toBe(false);
  });
  it("rejects an event fractionally before its opening statement", () => {
    const input = InvestmentActivity.examples[0]!;
    const entries = [{ ...input.entries[0]!, at: earlier }];
    expect(InvestmentActivity.props.safeParse({ ...input, since: later, entries }).success).toBe(false);
  });
  it("reads entitlement, payment and event dates without changing the writer date format", () => {
    const dividend = Dividends.examples[0]!;
    const { entitledAt, payOn } = dividend.distributions[0]!;
    const distribution = readComponent(Dividends, dividend, "d1");
    expect(distribution.find((line) => line.startsWith("  r1"))).toContain(entitledAt);
    expect(distribution[0]).toContain(`r1: ${payOn}`);
    expect(buildEntry(Dividends)).toMatch(/payOn[^,]*date YYYY-MM-DD/);
    const activity = InvestmentActivity.examples[0]!;
    const event = readComponent(InvestmentActivity, activity, "i1").find((line) => line.startsWith("  r2"));
    expect(event).toContain(activity.entries[1]!.at);
  });
});
