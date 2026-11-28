import type { FlowTemplate } from "../flow-template";
import { prompt } from "../../../entry/flow-cart_to_order.generated";

export const cartToOrder: FlowTemplate = {
  ...prompt,
  id: "cart_to_order",
  title: "Cart and order review",
  nameSlots: [],
  recordShape: {
    item: "string",
    quantity: "string",
    one: "string",
    two: "string",
    unit_price: "number",
    total: "string",
    collection: "string",
    delivery: "string",
    reference: "string",
  },
  journeys: [
    {
      role: "customer",
      id: "place_order",
      name: "Check out the cart",
      goal: "Keep the quantity, total and fulfillment for {record.reference} together.",
      steps: [
        {
          id: "cart",
          see: "Check the quantity of {record.item} before choosing how to get it.",
          do: "Update the quantity and choose pickup or delivery.",
          layout: { components: ["Choice"] },
          states: ["error"],
          preview: {
            title: "Your cart",
            action: "Choose fulfillment",
            choice: {
              field: "quantity",
              options: ["one", "two"],
              total: { field: "total", unitPrice: "unit_price" },
            },
            messages: {
              error:
                "{record.item} is no longer available. Nothing was ordered; review the cart before continuing.",
            },
          },
        },
        {
          id: "fulfillment",
          see: "Choose pickup at {record.collection} or delivery to {record.delivery}.",
          do: "Choose how to get your order.",
          next: null,
          choices: [
            { label: "Pick up", step: "review_pickup" },
            { label: "Deliver", step: "review_delivery" },
          ],
          layout: { components: ["KeyValue"] },
          states: ["waiting"],
          preview: { title: "Choose fulfillment", fields: ["item", "quantity", "total"], back: true },
        },
        {
          id: "review_pickup",
          see: "Pick up {record.item} at {record.collection}. No payment is taken here.",
          do: "Place the pickup order after reviewing the total.",
          next: "pickup",
          layout: { components: ["KeyValue"] },
          states: ["error"],
          preview: {
            title: "Review pickup",
            action: "Place pickup order",
            back: true,
            fields: ["item", "quantity", "total", "collection"],
            labels: { collection: "Pick up at" },
            messages: { error: "The price changed. Go back to review the updated cart before ordering." },
          },
        },
        {
          id: "review_delivery",
          see: "Deliver {record.item} to {record.delivery}. No payment is taken here.",
          do: "Place the delivery order after reviewing the total.",
          next: "deliver",
          layout: { components: ["KeyValue"] },
          states: ["error"],
          preview: {
            title: "Review delivery",
            action: "Place delivery order",
            back: true,
            fields: ["item", "quantity", "total", "delivery"],
            labels: { delivery: "Deliver to" },
            messages: { error: "The price changed. Go back to review the updated cart before ordering." },
          },
        },
        {
          id: "pickup",
          see: "Pickup order {record.reference} is placed. Check the order for pickup readiness. It isn't paid.",
          next: null,
          layout: { components: ["Success"] },
          states: ["success"],
          preview: {
            title: "Pickup order placed",
            fields: ["reference", "item", "quantity", "total", "collection"],
          },
        },
        {
          id: "deliver",
          see: "Delivery order {record.reference} is placed. Check the order for the arrival estimate. It isn't paid.",
          layout: { components: ["Success"] },
          states: ["success"],
          preview: {
            title: "Delivery order placed",
            fields: ["reference", "item", "quantity", "total", "delivery"],
          },
        },
      ],
    },
  ],
  examples: [
    {
      id: "print_shop",
      names: {},
      record: {
        item: "A3 risograph map",
        quantity: "1",
        one: "1",
        two: "2",
        unit_price: 18,
        total: "$18.00",
        collection: "Shop counter",
        delivery: "Studio reception",
        reference: "PRINT-84",
      },
    },
    {
      id: "market_bakery",
      names: {},
      record: {
        item: "Rye sourdough loaf",
        quantity: "2",
        one: "1",
        two: "2",
        unit_price: 7.5,
        total: "$15.00",
        collection: "Market Stall 6",
        delivery: "Front porch",
        reference: "RYE-67",
      },
    },
  ],
  probes: {
    pick: [
      {
        request:
          "Let me adjust how many loaves are in my cart, choose pickup or delivery and confirm the total before placing the order. Do not take payment yet.",
        expect: "cart_to_order",
      },
      {
        request: "Let me pay the balance for an order I already placed and get the receipt.",
        expect: "pay_receipt",
      },
    ],
    fill: [
      {
        request:
          "Cart has 'A3 risograph map' with quantity '1', choices '1' and '2', unit price 18 and total $18.00. Pickup 'Shop counter' or delivery 'Studio reception'. Reference PRINT-84.",
        expect: {
          names: {},
          record: {
            item: "A3 risograph map",
            quantity: "1",
            unit_price: 18,
            total: "$18.00",
            reference: "PRINT-84",
          },
        },
      },
    ],
  },
};
