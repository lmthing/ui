import type { PackMeta } from "../../catalog";

export const pack = {
  id: "commerce",
  example: "Crumb takes bakery pre-orders, offers pickup, and shows when each order is ready.",
  probes: [
    {
      kind: "pack",
      idea: "A small online shop selling handmade prints with a basket and customer checkout.",
      expect: ["commerce"],
    },
    {
      kind: "pack",
      idea: "A market stall selling produce: browse goods with prices, pay for an order, and collect it at the stall.",
      expect: ["commerce"],
    },
    {
      kind: "pack",
      idea: "A dog walker whose clients reserve available half-hour appointments. No products or goods are sold.",
      expect: ["booking"],
    },
    {
      kind: "choose",
      need: "In my shop, show only the current price and strike through the old price. No product information or buy controls.",
      expect: "Amount",
    },
  ],
} as const satisfies PackMeta;
