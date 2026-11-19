import { expect, it } from "vitest";
import { moneyLine } from "@lmthing/ui/catalog";
import { accountCopy, accountReading } from "../../copy";
import { moneyWordsFor } from "../../lang";

const account = { name: "Reserve", kind: "savings", balance: 1240.5 } as const;

it("uses the pack dictionary and shared locale formatting for the kind, suffix and signed balance", () => {
  const card = accountCopy({ ...account, last4: "0042", balance: -12.5 }, "de-DE");
  expect(card).toMatchObject({
    kind: moneyWordsFor("de-DE").accountKinds.savings,
    suffix: " · 0042",
    balance: "-12,50 $",
    label: "Reserve, Savings ending in 0042, -12,50 $",
  });
  expect(accountCopy(account).suffix).toBeUndefined();
  expect(accountCopy(account).balance).toBe("$1,240.50");
});

it.each([0, 1234567890.5, -1234567890.5, Number.MAX_VALUE, -Number.MAX_VALUE])(
  "preserves the exact accessible and read amount but bounds the display for %s",
  (balance) => {
    const row = { ...account, id: "r1", balance };
    const copy = accountCopy(row);
    const exact = moneyLine(balance);
    expect(copy.label).toContain(exact);
    expect(copy.balance.length).toBeLessThanOrEqual(11);
    expect(copy.balance.startsWith("-")).toBe(balance < 0);
    expect(accountReading([row])[0]).toContain(exact);
    expect(accountReading([row])[0]).toContain(`r1 Savings ${copy.balance}`);
  },
);
