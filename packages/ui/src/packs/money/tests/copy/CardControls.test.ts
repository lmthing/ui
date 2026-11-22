import { expect, it } from "vitest";
import { cardControlsCopy, cardControlsReading } from "../../copy";

const card = { network: "ebt", last4: "0024", expires: "03/29", spendCap: 0 } as const;

it("formats only public facts, preserves zeros, and omits the cap in brief detail", () => {
  expect(cardControlsCopy(card)).toEqual({ network: "EBT", last4: "•••• 0024", expires: "Expires 03/29" });
  const protectedCard = { ...card, cvv: "DEMO", maskedNumber: "DEMO-VALUE" };
  expect(cardControlsReading(protectedCard, "filled", "en-GB", "GBP")).toEqual([
    "EBT",
    "•••• 0024",
    "Expires 03/29",
    "Freeze card",
    "Online purchases",
    "ATM withdrawals",
    "Spending abroad",
    "Per-purchase limit: £0",
    "Unlock card details",
  ]);
  expect(cardControlsReading({ ...card, detail: "brief" }, "success")).toEqual([
    "EBT",
    "•••• 0024",
    "Expires 03/29",
    "Freeze card",
    "Online purchases",
    "ATM withdrawals",
    "Spending abroad",
    "Card settings updated",
  ]);
});
