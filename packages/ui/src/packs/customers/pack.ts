import type { PackMeta } from "../../catalog";

export const pack = {
  id: "customers",
  name: "Customers",
  purpose: "Keep a business's client records, history, invoices, reviews, rewards and signed agreements.",
  pick: "A business keeping track of the people it serves: client records, history, invoices and rewards. Past visits alone do not need scheduling (booking). Not people sharing posts, comments and follows with each other (social). Friends sharing with each other belong to social, not a core-only app.",
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
