import type { PackMeta } from "../../catalog";

export const pack = {
  id: "places",
  example: "Sniff finds dog-friendly venues nearby, shows their opening hours and suggests a park walk.",
  probes: [
    {
      kind: "pack",
      idea: "Find dog-friendly cafés and parks near me. Show them on a map and show each café's address and opening hours. No bookings or trip planning.",
      expect: ["places"],
    },
    {
      kind: "pack",
      idea: "My daily commute: see the next live bus departures and delays from my usual stop. No trips, itineraries or reservations.",
      expect: ["places"],
    },
    {
      kind: "pack",
      idea: "Plan a holiday with a day-by-day itinerary, hotel reservations and a packing list. No live departures, venue finder or local directions.",
      expect: ["trips"],
    },
    {
      kind: "choose",
      need: "Show just a tappable list of nearby parks, one short note per park and no map.",
      expect: "List",
    },
  ],
} as const satisfies PackMeta;
