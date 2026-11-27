import type { FlowTemplate } from "../flow-template";
import { prompt } from "../../../entry/flow-pay_receipt.generated";

export const payReceipt: FlowTemplate = {
  ...prompt,
  id: "pay_receipt",
  title: "Pay and view receipt",
  nameSlots: ["payer"],
  recordShape: {
    payee: "string",
    amount: "string",
    method: "string",
    reference: "string",
  },
  journeys: [
    {
      role: "payer",
      id: "settle_charge",
      name: "Pay a charge",
      goal: "{name.payer} has proof of payment to {record.payee} for {record.amount}.",
      steps: [
        {
          id: "review",
          see: "Check the amount and payment method before sending money to {record.payee}.",
          do: "Tap Confirm payment",
          layout: {
            components: ["KeyValue"],
          },
          states: ["empty", "error"],
          preview: {
            title: "Review payment",
            action: "Confirm payment",
            fields: ["payee", "amount", "method"],
            messages: {
              error: "Choose an available payment method before continuing.",
            },
          },
        },
        {
          id: "processing",
          see: "Payment of {record.amount} is pending. A receipt is not available yet.",
          do: "Tap Check payment",
          layout: {
            components: ["Note"],
          },
          states: ["waiting", "error"],
          preview: {
            title: "Payment processing",
            action: "Check payment",
            messages: {
              error: "Payment did not go through. Check the method before you try again.",
            },
          },
        },
        {
          id: "paid",
          see: "{record.payee} received {record.amount}. Your receipt is ready.",
          do: "Tap View receipt",
          layout: {
            components: ["Success"],
          },
          states: ["success"],
          preview: {
            title: "Payment successful",
            fields: ["payee", "amount"],
            action: "View receipt",
          },
        },
        {
          id: "receipt",
          see: "Keep this receipt as proof of payment: {record.reference}.",
          next: null,
          layout: {
            components: ["KeyValue"],
          },
          states: ["success"],
          preview: {
            title: "Receipt",
            fields: ["reference", "payee", "amount", "method"],
          },
        },
      ],
    },
  ],
  examples: [
    {
      id: "fee",
      names: {
        payer: "Ari",
      },
      record: {
        payee: "Workshop desk",
        amount: "$28.00",
        method: "Card ending 2041",
        reference: "RC-802",
      },
    },
    {
      id: "deposit",
      names: {
        payer: "Cleo",
      },
      record: {
        payee: "Studio office",
        amount: "$45.00",
        method: "Bank transfer",
        reference: "RC-953",
      },
    },
  ],
  probes: {
    pick: [
      {
        request: "Let a customer pay a due balance and retrieve a receipt afterward.",
        expect: "pay_receipt",
      },
      {
        request: "Let a buyer place a goods order and see preparation and delivery milestones.",
        expect: "order_track",
      },
    ],
    fill: [
      {
        request: "Ari pays Workshop desk $28.00 using Card ending 2041. The receipt reference is RC-802.",
        expect: {
          names: {
            payer: "Ari",
          },
          record: {
            payee: "Workshop desk",
            amount: "$28.00",
            method: "Card ending 2041",
            reference: "RC-802",
          },
        },
      },
    ],
  },
};
