import { expect, it } from "vitest";
import { transferCopy, type TransferInput } from "../../copy";

const input = {
  mode: "send",
  draft: "24.50",
  recipient: { name: "Mina" },
  sources: [{ label: "Account", last4: "1234", balance: 25 }],
  sourceAt: 0,
  speed: "instant",
  instantFee: 0.5,
  style: "transfer",
  detail: "full",
} satisfies TransferInput;

it("calculates the fee and total and displays the amount in currency", () => {
  expect(transferCopy(input, "filled")).toMatchObject({
    recipient: "To Mina",
    sources: [{ label: "Account · 1234", value: 0 }],
    amount: "$24.50",
    fee: "$0.50",
    total: "$25",
    ready: true,
  });
  expect(transferCopy({ ...input, draft: "24.51" }, "filled")).toMatchObject({ ready: false });
  expect(transferCopy({ ...input, speed: "standard" }, "filled")).toMatchObject({
    fee: "$0",
    total: "$24.50",
  });
});

it("does not show a payable total before an amount is entered", () => {
  expect(transferCopy({ ...input, draft: "" }, "empty")).toMatchObject({
    amount: "$0.00",
    fee: "$0.50",
    total: undefined,
    ready: false,
  });
});

it("does not charge the sender's fee or check the recipient's balance when requesting", () => {
  expect(transferCopy({ ...input, mode: "request", draft: "500" }, "filled", "en-GB", "GBP")).toMatchObject({
    recipient: "From Mina",
    fee: "£0",
    total: "£500",
    ready: true,
  });
});
