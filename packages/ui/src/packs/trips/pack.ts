import type { PackMeta } from "../../catalog";

export const pack = {
  id: "trips",
  example: "Wander plans ten days in Japan, keeps tickets together and gets two travellers ready to go.",
  probes: [
    {
      kind: "pack",
      idea: "Plan a holiday in Japan with a day-by-day itinerary, train and hotel confirmations, and a packing list.",
      expect: ["trips"],
    },
    {
      kind: "pack",
      idea: "A business traveller's personal travel wallet for flight references, passport expiry dates and the destination forecast.",
      expect: ["trips"],
    },
    {
      kind: "pack",
      idea: "Organise my wedding reception: track guest RSVPs, assign seats and manage suppliers. No honeymoon or guest travel planning.",
      expect: ["events"],
    },
    {
      kind: "choose",
      need: "Put a live countdown to our March 4 departure on the screen. It should automatically say how many days are left until that date, not show a fraction, a goal or a progress ring.",
      expect: "Timer",
    },
  ],
} as const satisfies PackMeta;
