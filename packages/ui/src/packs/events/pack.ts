import type { PackMeta } from "../../catalog";

export const pack = {
  id: "events",
  example: "Vows plans a wedding, tracks replies and seating, and checks guests in on the day.",
  probes: [
    {
      kind: "pack",
      idea: "Plan one wedding: send invitations, track RSVPs and dietary needs, assign each guest to a table and manage the gift registry.",
      expect: ["events"],
    },
    {
      kind: "pack",
      idea: "Run admission for a one-night charity gala: issue tickets and scan them at the door, or check guests in by name.",
      expect: ["events"],
    },
    {
      kind: "pack",
      idea: "Plan a two-week rail holiday: keep hotel and train confirmations, a day-by-day itinerary and packing lists. No gathering to organise.",
      expect: ["trips"],
    },
    {
      kind: "choose",
      need: "Count down automatically to the wedding date and time. Show the remaining time as it elapses, with no manual plus or minus controls.",
      expect: "Timer",
    },
  ],
} as const satisfies PackMeta;
