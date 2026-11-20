import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const orders = {
  id: "orders",
  job: "Manage the seller's orders",
  defaultLayout: "today",
  layouts: {
    today: {
      writeHints: [
        'List rows carry order numbers as title, time as meta, and short status values; set trail "badge" on List. Keep each row plain: no body, photo, section, rank or personal “me” marker.',
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Segmented"], required: true },
        { allow: ["Stats"], required: true },
        { allow: ["List"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Segmented" },
        { id: "s2", c: "Stats" },
        { id: "l1", c: "List", trail: "badge" },
      ],
    },
    order: {
      writeHints: [
        "OrderStatus uses seller true, 3–5 steps, and zero-based at. The current step is not the last one if the seller still needs to advance it.",
      ],
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["OrderStatus"], required: true },
        { allow: ["OrderSummary"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "o1", c: "OrderStatus", seller: true },
        { id: "o2", c: "OrderSummary" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "orders",
    layout: "today",
    brief:
      "Switch between order views, see today's order count, and open an order from a list with status badges.",
  },
  {
    kind: "compose",
    archetype: "orders",
    layout: "order",
    brief: "Open one order as a seller, advance its fulfillment stage, and review the receipt.",
  },
] satisfies ComposeProbe[];
