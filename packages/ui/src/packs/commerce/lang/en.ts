export type CommerceWords = {
  addProduct: (name: string) => string;
  advanceOrder: (stage: string) => string;
  currentOrderStage: (stage: string) => string;
  emptyProducts: string;
  orderComplete: string;
  priceChange: (was: string, price: string) => string;
  product: {
    stock: (count: string) => string;
    stockField: string;
    soldOut: string;
    quantity: (count: string) => string;
    save: string;
    unsave: string;
    add: string;
    added: string;
  };
  checkout: {
    fulfillment: string;
    payment: string;
    modes: Record<"pickup" | "delivery" | "table", string>;
    methods: Record<"card" | "cash" | "wallet", string>;
    time: string;
    address: string;
    addAddress: string;
    total: string;
    unavailable: string;
    place: string;
    success: string;
  };
  orderNumber: (number: string) => string;
  orderMode: Record<"pickup" | "delivery" | "table", string>;
  orderTotal: string;
  reorder: string;
  receiptSeparator: string;
  promoEnds: string;
  copyPromoCode: (code: string) => string;
  variantUnavailable: string;
  variantReading: (label: string, details: readonly string[]) => string;
  sizeGuide: {
    size: string;
    unit: string;
    units: Record<"cm" | "in", string>;
    fit: string;
    fitWords: readonly [string, string, string];
    reference: (size: string) => string;
  };
};

export const en = {
  addProduct: (name) => `Add ${name} to basket`,
  advanceOrder: (stage) => `Mark as ${stage}`,
  currentOrderStage: (stage) => `Current stage: ${stage}`,
  emptyProducts: "No products to show",
  orderComplete: "Order complete",
  priceChange: (was, price) => `${was} → ${price}`,
  product: {
    stock: (count) => `Only ${count} left`,
    stockField: "stock",
    soldOut: "Sold out",
    quantity: (count) => `Quantity: ${count}`,
    save: "Save for later",
    unsave: "Remove from saved items",
    add: "Add to basket",
    added: "Added to basket",
  },
  checkout: {
    fulfillment: "Fulfillment",
    payment: "Payment",
    modes: { pickup: "pickup", delivery: "delivery", table: "table" },
    methods: { card: "card", cash: "cash", wallet: "wallet" },
    time: "Time",
    address: "Delivery address",
    addAddress: "Add delivery address",
    total: "Order total",
    unavailable: "Unavailable",
    place: "Place order",
    success: "Order placed",
  },
  orderNumber: (number) => `Order #${number}`,
  orderMode: { pickup: "Pickup", delivery: "Delivery", table: "At table" },
  orderTotal: "Total",
  reorder: "Reorder",
  receiptSeparator: " · ",
  promoEnds: "ends",
  copyPromoCode: (code) => `Copy ${code}`,
  variantUnavailable: "Sold out",
  variantReading: (label, details) => [label, ...details].join(" · "),
  sizeGuide: {
    size: "Size",
    unit: "Measurement units",
    units: { cm: "cm", in: "in" },
    fit: "Fit",
    fitWords: ["Runs small", "True to size", "Runs large"],
    reference: (size) => `Reference size: ${size}`,
  },
} satisfies CommerceWords;
