export type CommerceWords = {
  addProduct: (name: string) => string;
  advanceOrder: (stage: string) => string;
  currentOrderStage: (stage: string) => string;
  emptyProducts: string;
  orderComplete: string;
  priceChange: (was: string, price: string) => string;
  cartBar: {
    view: string;
    count: (formatted: string, singular: boolean) => string;
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
  cart: {
    empty: string;
    promo: string;
    subtotal: string;
    delivery: string;
    deliveryReading: string;
    total: string;
    quantity: string;
    unitPrice: (price: string) => string;
    remove: (name: string) => string;
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
};

export const en = {
  addProduct: (name) => `Add ${name} to basket`,
  advanceOrder: (stage) => `Mark as ${stage}`,
  currentOrderStage: (stage) => `Current stage: ${stage}`,
  emptyProducts: "No products to show",
  orderComplete: "Order complete",
  priceChange: (was, price) => `${was} → ${price}`,
  cartBar: {
    view: "View basket",
    count: (formatted, singular) => `${formatted} ${singular ? "item" : "items"}`,
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
  cart: {
    empty: "Your basket is empty",
    promo: "Promo code",
    subtotal: "Subtotal",
    delivery: "Delivery",
    deliveryReading: "delivery",
    total: "Total",
    quantity: "Quantity",
    unitPrice: (price) => `${price} each`,
    remove: (name) => `Remove ${name}`,
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
} satisfies CommerceWords;
