import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const checkout = {
  id: "checkout",
  job: "Place an order and follow it",
  defaultLayout: "pay",
  layouts: {
    pay: {
      writeHints: [
        "Use unique modes and methods and select a value from each list. Do not supply a basket total on Checkout.",
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Checkout"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "c1", c: "Checkout" },
        { id: "n1", c: "Note" },
      ],
    },
    status: {
      writeHints: [
        "OrderStatus uses seller false, 3–5 steps, and zero-based at. For the OrderSummary, use unit prices and short names; do not write a total.",
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["OrderStatus"], required: true },
        { allow: ["OrderSummary"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "o1", c: "OrderStatus", seller: false },
        { id: "o2", c: "OrderSummary" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "checkout",
    layout: "pay",
    brief: "Select pickup and payment, place the order, and read a short supporting note.",
  },
  {
    kind: "compose",
    archetype: "checkout",
    layout: "status",
    brief: "Follow the milestones of an order as a buyer and see the receipt.",
  },
] satisfies ComposeProbe[];
