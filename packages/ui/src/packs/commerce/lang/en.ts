import { words as ProductGridWords } from "./en/ProductGrid";
import { words as OrderStatusWords } from "./en/OrderStatus";
import { words as packWords } from "./en/pack";
import { words as PromoWords } from "./en/Promo";
import { words as CartBarWords } from "./en/CartBar";
import { words as ProductWords } from "./en/Product";
import { words as CartWords } from "./en/Cart";
import { words as CheckoutWords } from "./en/Checkout";
import { words as OrderSummaryWords } from "./en/OrderSummary";
import { words as VariantPickerWords } from "./en/VariantPicker";
import { words as SizeGuideWords } from "./en/SizeGuide";
import { words as SavedListWords } from "./en/SavedList";
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
  cartBar: {
    view: string;
    count: (formatted: string, singular: boolean) => string;
  };
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
    readActions: string;
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
  ...ProductGridWords,
  ...OrderStatusWords,
  ...packWords,
  ...PromoWords,
  ...CartBarWords,
  ...ProductWords,
  ...CartWords,
  ...CheckoutWords,
  ...OrderSummaryWords,
  ...VariantPickerWords,
  ...SizeGuideWords,
  ...SavedListWords,
} satisfies CommerceWords;
