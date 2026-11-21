import { expect, it } from "vitest";
import { components } from "@lmthing/ui/catalog";
import { ledgerDisplay } from "../../copy";

const ledger = components.Ledger;
const data = ledger.meta.previewDeviceData();

it("uses trusted VAT rates and computes VAT, gross, and running account balances", () => {
  const result = ledgerDisplay(ledger.props.parse(ledger.examples[0]), data, "en");
  expect(result).toMatchObject({ totalIn: "£180", totalOut: "£28.80" });
  expect(result.rows.map(({ vat, balance }) => [vat, balance])).toEqual([
    ["VAT: £30", "Balance: £630"],
    ["VAT: £4.80", "Balance: £601.20"],
  ]);
});

it("preserves both cash movements with no VAT on a transfer", () => {
  const result = ledgerDisplay(ledger.props.parse(ledger.examples[1]), data, "en");
  expect(result).toMatchObject({ totalIn: "£94", totalOut: "£40" });
  expect(result.rows.map(({ balance }) => balance)).toEqual([
    "Balance: £410",
    "Balance: £190",
    "Balance: £464",
  ]);
});

it("does not invent tax or balances without the host's inputs", () => {
  const result = ledgerDisplay(ledger.props.parse(ledger.examples[0]), undefined, "en");
  expect(result).toMatchObject({ totalIn: "—", totalOut: "—" });
  expect(result.rows[0]).toMatchObject({ net: "Net: $150", vat: "VAT: —", balance: "Balance: —" });
});

it("includes trusted period records outside the displayed set in totals and running balances", () => {
  const seed = ledger.props.parse(ledger.examples[0]);
  const earlier = { ...seed.entries[0], entryRef: "earlier", date: seed.from, net: 20 };
  const outside = { ...earlier, entryRef: "before_period", date: "2026-10-31" };
  const result = ledgerDisplay(seed, { ...data, books_ledger_entries: [outside, earlier, ...seed.entries] });
  expect(result.totalIn).toBe("£204");
  expect(result.rows).toHaveLength(seed.entries.length);
  expect(result.rows[0]?.balance).toBe("Balance: £654");
});
