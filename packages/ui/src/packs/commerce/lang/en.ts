export type CommerceWords = {
  addProduct: (name: string) => string;
  advanceOrder: (stage: string) => string;
  currentOrderStage: (stage: string) => string;
  emptyProducts: string;
  orderComplete: string;
  tracking: { copy: (id: string) => string; proof: string; pickup: (code: string) => string; here: string };
  claimed: string;
  deals: string;
  offerExpired: string;
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
    aisle: (aisle: string) => string;
    storeStock: (count: string) => string;
    scan: string;
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
  shadeDepth: Record<"fair" | "light" | "medium" | "deep", string>;
  shadeUndertone: Record<"cool" | "neutral" | "warm", string>;
  variantReading: (label: string, details: readonly string[]) => string;
  sizeGuide: {
    size: string;
    unit: string;
    units: Record<"cm" | "in", string>;
    fit: string;
    fitWords: readonly [string, string, string];
    reference: (size: string) => string;
  };
  savedList: {
    move: string;
    remove: (name: string) => string;
    claim: string;
    claimItem: (name: string) => string;
    target: string;
    alert: (name: string) => string;
    previous: (price: string) => string;
    priceDrop: (amount: string) => string;
    blank: string;
    priceGap: string;
    success: string;
    error: string;
  };
};

export const en = {
  addProduct: (name) => `Add ${name} to basket`,
  advanceOrder: (stage) => `Mark as ${stage}`,
  currentOrderStage: (stage) => `Current stage: ${stage}`,
  emptyProducts: "No products to show",
  orderComplete: "Order complete",
  tracking: {
    copy: (id) => `Copy tracking number ${id}`,
    proof: "Delivery proof",
    pickup: (code) => `Pickup code: ${code}`,
    here: "I’m here",
  },
  claimed: "Claimed",
  deals: "Deals",
  offerExpired: "Offer ended",
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
    aisle: (aisle) => `Aisle ${aisle}`,
    storeStock: (count) => `${count} in store`,
    scan: "Scan barcode",
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
  shadeDepth: { fair: "Fair", light: "Light", medium: "Medium", deep: "Deep" },
  shadeUndertone: { cool: "Cool", neutral: "Neutral", warm: "Warm" },
  variantReading: (label, details) => [label, ...details].join(" · "),
  sizeGuide: {
    size: "Size",
    unit: "Measurement units",
    units: { cm: "cm", in: "in" },
    fit: "Fit",
    fitWords: ["Runs small", "True to size", "Runs large"],
    reference: (size) => `Reference size: ${size}`,
  },
  savedList: {
    move: "To basket",
    remove: (name) => `Remove ${name} from saved items`,
    claim: "Claimed",
    claimItem: (name) => `Claim ${name}`,
    target: "Target price",
    alert: (name) => `Target price for ${name}`,
    previous: (price) => `Was ${price}`,
    priceDrop: (amount) => `${amount} less`,
    blank: "\u00a0",
    priceGap: "\u00a0\u00a0",
    success: "Saved list updated",
    error: "Could not update saved items",
  },
} satisfies CommerceWords;
