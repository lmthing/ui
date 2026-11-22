import type { CommerceWords } from "..";

export const words = {
  cartBar: {
    view: "View basket",
    count: (formatted, singular) => `${formatted} ${singular ? "item" : "items"}`,
  },
} satisfies Pick<CommerceWords, "cartBar">;
