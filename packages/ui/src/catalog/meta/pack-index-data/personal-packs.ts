export const personalPacks = [
  {
    id: "health",
    name: "Health",
    purpose:
      'The most-asked personal app family: logging workouts set by set, taking medication on time, watching a body measurement move toward a goal, keeping several healthy habits, tracking symptoms, vitals and a menstrual cycle. Everything stays on the phone; nothing here is medical advice, and "what\'s real?" says so.',
    pick: "The body: workouts, medication, measurements, symptoms, cycles. Not the mind (mind), not food (kitchen)",
  },
  {
    id: "mind",
    name: "Mind",
    purpose:
      "Looking after how one feels: a daily check-in of mood and what affected it, a journal, naming feelings, breathing exercises, sleep, calming sounds, and the patterns that show up over weeks. It is calm by design: soft presets, no red alarms, nothing competitive.",
    pick: "The mind: mood, journaling, feelings, breathing, sleep. Not the body (health)",
  },
  {
    id: "kitchen",
    name: "Kitchen",
    purpose:
      "Everything about food in a household: cooking from a recipe with the right amounts and timers, planning the week's meals, the shopping list that follows from it, what is in the cupboard and when it goes off, and a simple log of what was eaten.",
    pick: "Food at home: recipes, meal plans, groceries, the pantry, food logs. Not selling food (commerce)",
  },
  {
    id: "home",
    name: "Home",
    purpose:
      "The work of a home shared among the people in it: chores and whose turn it is, rewards for kids, the family's week, recurring care for pets, plants, the car and the house, a baby's feeds and sleeps, and the devices in the rooms, including set points, one-tap scenes and sensor readings.",
    pick: "Running a household: chores, family, pets, plants, cars, the house and its devices. Not a business team (team)",
  },
  {
    id: "trips",
    name: "Trips",
    purpose:
      "One trip from planning to coming home: the plan day by day, the confirmations for flights, trains, stays and tickets, what to pack, the documents to carry, the weather where you are going, money in the local currency and the time back home. Shared costs on a trip come from money; places to visit from places.",
    pick: "Trip planning or a travel wallet: itineraries, existing travel confirmations, packing, passport and visa expiry, destination forecasts. Those travel details do not also need booking, paperwork or places. Not organising an event (events)",
  },
  {
    id: "events",
    name: "Events",
    purpose:
      "Running one event from the organiser's side and the guest's: who is invited and coming, what they will eat, where they sit, who supplies what and what it costs, tickets and the door on the day, the gift list, and finding a date that suits everyone. Weddings, parties, reunions, fundraisers, small conferences.",
    pick: "Organising one gathering: guests, RSVPs, seating, tickets, suppliers, gifts. Not travel (trips)",
  },
  {
    id: "inventory",
    name: "Inventory",
    purpose:
      "Knowing what you have, where it is, who has it, when its warranty ends and what you still want, from a garage of boxes to a small shop's stock room, a record collection or a few rental flats. For rentals it covers the listing, the lease and a single rental-repair summary only; any request workflow (queue, triage, thread, work order) belongs to the requests pack. The tenants themselves are customers.",
    pick: "Keeping track of things owned: stock, collections, storage, loans, warranties, rentals. Not selling them (commerce)",
  },
  {
    id: "sports",
    name: "Sports",
    purpose:
      "Amateur and grassroots sport, run by volunteers: the next match and who is available, the lineup, keeping the score live, what happened in the match, the league table and a knockout cup. It works for any sport with sides, scores and fixtures; football is the default for positions and periods.",
    pick: "A sports team or league: fixtures, scores, standings, lineups, availability. Not a workout (health)",
  },
] as const;
