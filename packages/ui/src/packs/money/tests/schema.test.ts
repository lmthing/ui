import { describe, expect, it } from "vitest";
import { components, type Definition } from "@lmthing/ui/catalog";

const defs = components as Record<string, Definition>;
const neutral = { things: [], items: [] };
const seed = (id: string) => defs[id]!.fallback({ cast: neutral }) as Record<string, unknown>;
const account = { name: "A", kind: "cash", balance: 0, swatch: "grey", goto: "details" };
const entry = { date: "2026-11-19", payee: "A", category: "B", icon: "dot", amount: -1, goto: "details" };
const bill = { name: "A", amount: 0, repeat: "never", paid: false, icon: "dot" };
const debt = { name: "A", principal: 1, rate: 0, payment: 1, firstDue: "2026-12-01", payments: [] };
const person = { name: "A", photo: "lib:people" };

const invalid: Record<string, unknown[]> = {
  AccountCard: [
    { accounts: [] },
    { accounts: Array(5).fill(account) },
    { accounts: [{ ...account, name: "a".repeat(21) }] },
    { accounts: [{ ...account, kind: "business" }] },
    { accounts: [{ ...account, last4: "12345" }] },
    { accounts: [{ ...account, last4: "abcd" }] },
    { accounts: [{ ...account, swatch: "#ffffff" }] },
    { accounts: [{ ...account, goto: "Bad ID" }] },
    { accounts: [{ ...account, balance: "10" }] },
  ],
  Transactions: [
    { entries: [] },
    { entries: Array(7).fill(entry) },
    { entries: [{ ...entry, date: "2026-02-30" }] },
    { entries: [{ ...entry, payee: "a".repeat(29) }] },
    { entries: [{ ...entry, category: "a".repeat(17) }] },
    { entries: [{ ...entry, icon: "unknown" }] },
    { entries: [{ ...entry, amount: "12" }] },
    { entries: [{ ...entry, total: 1 }] },
  ],
  Bills: [
    { bills: [] },
    { bills: Array(7).fill(bill) },
    { bills: [{ ...bill, name: "a".repeat(25) }] },
    { bills: [{ ...bill, amount: -1 }] },
    { bills: [{ ...bill, due: "2026-02-30" }] },
    { bills: [{ ...bill, repeat: "daily" }] },
    { bills: [{ ...bill, overdue: true }] },
    { bills: [bill], style: "grid" },
  ],
  Split: [
    { ...seed("Split"), people: [person] },
    { ...seed("Split"), people: Array(7).fill(person) },
    { ...seed("Split"), people: [{ ...person, photo: "https://example.org/photo" }, person] },
    { ...seed("Split"), people: [{ ...person, name: "a".repeat(21) }, person] },
    { ...seed("Split"), expenses: [{ title: "a".repeat(29), amount: 1, by: 0, split: "equal" }] },
    { ...seed("Split"), expenses: [{ title: "A", amount: 1, by: 2, split: "equal" }] },
    { ...seed("Split"), expenses: [{ title: "A", amount: 1, by: 0.5, split: "equal" }] },
    { ...seed("Split"), expenses: Array(7).fill({ title: "A", amount: 1, by: 0, split: "equal" }) },
    { ...seed("Split"), balances: [0, 0] },
  ],
  AmountPad: [
    { label: "a".repeat(25), note: false },
    { label: "A", note: "text" },
    { label: "A", note: true, value: -1 },
    { label: "A", note: true, max: -1 },
    { label: "A", note: true, max: 10, value: 11 },
  ],
  PriceChart: [
    { name: "A", points: Array(7).fill(1), range: "day" },
    { name: "A", points: Array(61).fill(1), range: "day" },
    { name: "a".repeat(25), points: Array(8).fill(1), range: "day" },
    { name: "A", points: Array(8).fill("1"), range: "day" },
    { name: "A", points: Array(8).fill(1), range: "quarter" },
    { name: "A", points: Array(8).fill(1), range: "day", current: 1 },
  ],
  Loan: [
    { ...debt, name: "a".repeat(25) },
    { ...debt, principal: 0 },
    { ...debt, rate: -1 },
    { ...debt, rate: 101 },
    { ...debt, payment: 0 },
    { ...debt, firstDue: "2026-02-30" },
    { ...debt, payments: [{ due: "2026-12-01", amount: 0 }] },
    { ...debt, payments: Array(7).fill({ due: "2026-12-01", amount: 1 }) },
    { ...debt, balance: 1 },
    { ...debt, finish: "2027-01-01" },
    { ...debt, currency: "EUR" },
    { ...debt, style: "compact" },
    { ...debt, linked: true },
  ],
  Payoff: [
    { debts: [] },
    { debts: Array(7).fill(debt) },
    { debts: [debt], extra: -1 },
    { debts: [{ ...debt, principal: 0 }] },
    { debts: [debt], strategy: "alphabetical" },
    { debts: [debt], style: "schedule" },
    { debts: [debt], budget: 1 },
    { debts: [{ ...debt, currentBalance: 1 }] },
    { debts: [debt], chart: [1, 0] },
  ],
};

describe.each(Object.entries(invalid))("%s schema", (id, inputs) => {
  it.each(inputs)("rejects invalid boundaries and computed or unknown fields", (input) => {
    expect(defs[id]!.props.safeParse(input).success).toBe(false);
  });
  it("rejects unknown top-level fields and non-finite values", () => {
    expect(defs[id]!.props.safeParse({ ...seed(id), color: "#fff" }).success).toBe(false);
    const field =
      id === "Loan" ? "principal" : id === "AmountPad" ? "value" : id === "Payoff" ? "extra" : undefined;
    if (field)
      for (const value of [Infinity, -Infinity, NaN])
        expect(defs[id]!.props.safeParse({ ...seed(id), [field]: value }).success).toBe(false);
  });
});

it("accepts exact maxima, zero-rate debts and schema defaults", () => {
  expect(
    components.AccountCard.props.safeParse({
      accounts: Array(4).fill({ ...account, name: "a".repeat(20), last4: "1234" }),
    }).success,
  ).toBe(true);
  expect(
    components.Transactions.props.safeParse({
      entries: Array(6).fill({ ...entry, payee: "a".repeat(28), category: "a".repeat(16) }),
    }).success,
  ).toBe(true);
  expect(
    components.Bills.props.safeParse({ bills: Array(6).fill({ ...bill, name: "a".repeat(24) }) }).success,
  ).toBe(true);
  expect(
    components.Split.props.safeParse({
      people: Array(6).fill({ ...person, name: "a".repeat(20) }),
      expenses: Array(6).fill({ title: "a".repeat(28), amount: 1, by: 5, split: "equal" }),
      goto: "entry",
    }).success,
  ).toBe(true);
  expect(
    components.AmountPad.props.safeParse({ label: "a".repeat(24), note: true, max: 10, value: 10 }).success,
  ).toBe(true);
  expect(
    components.PriceChart.props.safeParse({ name: "a".repeat(24), points: Array(60).fill(1), range: "all" })
      .success,
  ).toBe(true);
  const maxDebt = {
    ...debt,
    name: "a".repeat(24),
    rate: 100,
    payments: Array(6).fill({ due: "2026-12-01", amount: 1 }),
  };
  expect(components.Loan.props.safeParse(maxDebt).success).toBe(true);
  expect(components.Payoff.props.safeParse({ debts: Array(6).fill(maxDebt) }).success).toBe(true);
  expect(components.Payoff.props.parse({ debts: [debt] })).toMatchObject({
    extra: 0,
    strategy: "high_rate",
    style: "plan",
    linked: false,
  });
  expect(components.Loan.props.parse(debt)).toMatchObject({ rate: 0, style: "summary", linked: false });
});
