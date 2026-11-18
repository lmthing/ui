import type { PackMeta } from "../../catalog";

export const pack = {
  id: "customers",
  example: "Trot keeps owners, dogs, walk history, invoices, loyalty stamps and key-holding consent.",
  probes: [
    {
      kind: "pack",
      idea: "A dog walker's client book with owners, their history, invoices and key-holding consent",
      expect: ["customers"],
    },
    {
      kind: "pack",
      idea: "A café keeping customers' loyalty stamps and reviews, without selling or ordering in the app",
      expect: ["customers"],
    },
    {
      kind: "pack",
      idea: "My friends sharing posts, comments and following each other, not a business's clients",
      expect: ["social"],
    },
    {
      kind: "choose",
      need: "Show all my clients as tappable rows with a photo and short last-visit detail for each",
      expect: "List",
    },
  ],
} as const satisfies PackMeta;
