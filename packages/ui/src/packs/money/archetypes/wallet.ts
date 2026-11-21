import type { ArchetypeMeta } from "../../../catalog";

export const wallet = {
  id: "wallet",
  job: "My money now",
  defaultLayout: "accounts",
  layouts: {
    accounts: {
      writeHints: [
        'Always write all four required components in order: Header, Amount with emphasis "hero", AccountCard, Transactions. Keep other Amount axes and style null. An empty cast still needs separate account cards and recent entry rows; use neutral fallback content rather than omitting either required component.',
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Amount"], required: true },
        { allow: ["AccountCard"], required: true },
        { allow: ["Transactions"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "a1", c: "Amount", emphasis: "hero" },
        { id: "a2", c: "AccountCard" },
        { id: "t1", c: "Transactions" },
      ],
    },
    goal: {
      writeHints: [
        "The Ring is the main savings-goal figure. Leave Amount emphasis null so the screen has at most one hero.",
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Ring"], required: true },
        { allow: ["Amount"], required: true },
        { allow: ["Transactions"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "r1", c: "Ring" },
        { id: "a1", c: "Amount" },
        { id: "t1", c: "Transactions" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;
