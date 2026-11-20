import { expect, it } from "vitest";
import { components, readComponent, stampItemIds, type Props } from "@lmthing/ui/catalog";
import { rentCopy, rentGroups } from "../../copy";
import { propertyWordsFor, registerPropertyWords } from "../../lang";

const def = components.RentRoll;
const ledger = def.examples[0]!;
const compact = def.examples[1]!;

it("formats exact and abbreviated figures from the same totals", () => {
  const { totals } = def.props.parse(compact);
  expect(rentCopy("exact").summary(totals)[0]?.value).toBe("$11,000");
  expect(rentCopy("short").summary(totals)[0]?.value).toBe("$11K");
  expect(rentCopy("short").summary(totals)[1]?.value).toBe("$0");
});

it("uses locale-aware dates and currency and the registered pack words in the read", () => {
  const en = propertyWordsFor();
  const unregister = registerPropertyWords("fr", {
    rentRoll: {
      ...en.rentRoll,
      assessed: "Facturé",
      method: { ...en.rentRoll.method, transfer: "Virement" },
    },
  });
  try {
    const read = readComponent(def, ledger, "c1", "filled", {}, "fr-FR").join("\n");
    for (const value of ["novembre 2026", "Facturé", "5 nov. 2026", "Virement", "$US"])
      expect(read).toContain(value);
  } finally {
    unregister();
  }
});

it("groups allocations with the right charge without renumbering receipts", () => {
  const [charge] = ledger.charges;
  const [receipt] = ledger.receipts;
  const otherCharge = { ...charge!, chargeRef: "other" };
  const otherReceipt = { ...receipt!, receiptRef: "other_receipt", chargeRef: "other" };
  const input = { ...ledger, charges: [charge!, otherCharge], receipts: [otherReceipt, receipt!] };
  const parsed = stampItemIds(def.meta, def.props.parse(input)) as Props<typeof def.props, typeof def.meta>;
  expect(rentGroups(parsed.lines).map(({ charge, receipts }) => [charge.id, receipts[0]?.id])).toEqual([
    ["r1", "r4"],
    ["r2", "r3"],
  ]);
});
