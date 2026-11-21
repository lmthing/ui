import type { PackMeta } from "../../catalog";

export const pack = {
  id: "social",
  example:
    "Fernpost is a plant-swap community with member posts, a swap poll, a meetup, a group challenge and a swipe deck.",
  probes: [
    {
      kind: "pack",
      idea: "A private circle of friends sharing photos and short posts with one another, with comments, likes and follows.",
      expect: ["social"],
    },
    {
      kind: "pack",
      idea: "An online hobby community where people share posts about their latest creations, react to them and reply to each other. No shop, customer records or association administration.",
      expect: ["social"],
    },
    {
      kind: "pack",
      idea: "A business keeps customer profiles, past visit notes and a loyalty history for each of its clients. Clients do not post or interact with each other.",
      expect: ["customers"],
    },
    {
      kind: "choose",
      need: "Show an ordinary list of the group's members with names and roles. No posts, temporary updates or invitations.",
      expect: "People",
    },
  ],
} as const satisfies PackMeta;
