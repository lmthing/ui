import { expect, it } from "vitest";
import { affordancesOf, components, migrateLine, readComponent, stampItemIds } from "@lmthing/ui/catalog";

const loan = {
  name: "Car loan",
  principal: 6000,
  rate: 6,
  payment: 250,
  firstDue: "2026-12-01",
  payments: [],
};
const cases = [
  ["Loan", "summary", "brief", loan, ["loan/edit"]],
  ["Loan", "schedule", "full", loan, ["loan/edit"]],
  ["Payoff", "plan", "full", { debts: [loan] }, ["loan/strategy", "loan/extra", "loan/edit"]],
  ["Payoff", "compact", "brief", { debts: [loan] }, ["loan/strategy", "loan/extra", "loan/edit"]],
] as const;

it.each(cases)("migrates %s %s to %s and keeps the original targets", (c, style, detail, source, actions) => {
  const original = { ...source, c, style, goto: "terms", id: "loan", state: "filled" };
  const line = migrateLine(original);
  const { c: name, id, state, ...input } = line;
  expect({ c: name, id, state }).toEqual({ c, id: "loan", state: "filled" });
  expect(input).not.toHaveProperty("style");
  const def = components[c];
  const parsed = def.props.parse(input);
  expect(parsed).toMatchObject({ detail, goto: "terms" });
  const stamped = stampItemIds(def.meta, parsed);
  if (c === "Payoff") expect(stamped).toMatchObject({ debts: [{ id: "r1", ...loan }] });
  expect(affordancesOf(def.meta, stamped, "loan").map(({ address }) => address)).toEqual(actions);
  expect(readComponent(def, input, "loan")).toEqual(
    readComponent(def, { ...source, detail, goto: "terms" }, "loan"),
  );
  const explicit = detail === "full" ? "brief" : "full";
  const overridden = migrateLine({ ...original, detail: explicit });
  expect(overridden).toMatchObject({ detail: explicit });
  expect(overridden).not.toHaveProperty("style");
  expect(migrateLine(line)).toEqual(line);
});

it("accepts the AccountCard stacked spelling and keeps explicit arrangements and links", () => {
  const { meta, props, examples } = components.AccountCard;
  const first = examples[0]!;
  const source = { c: "AccountCard", id: "wallet", ...first, style: "stacked" };
  const { c: _c, id, ...input } = migrateLine(source);
  expect(id).toBe("wallet");
  expect(input).not.toHaveProperty("style");
  expect(input).toMatchObject({ arrange: "rows", accounts: first.accounts });
  const parsed = stampItemIds(meta, props.parse(input));
  expect(affordancesOf(meta, parsed, id as string).map(({ address, detail }) => [address, detail])).toEqual([
    ["wallet/r1", "→supplies"],
    ["wallet/r2", "→current"],
  ]);
  expect(migrateLine({ ...source, arrange: "strip" })).toMatchObject({ arrange: "strip" });
  expect(migrateLine({ ...loan, c: "Loan", style: "installments" })).toMatchObject({ style: "installments" });
});
