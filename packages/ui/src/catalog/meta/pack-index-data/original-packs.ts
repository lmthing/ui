export const originalPacks = [
  {
    id: "booking",
    name: "Booking",
    purpose: "Offer services and book appointments, classes and free start times.",
    pick: "Booking time with someone: appointments, classes, slots and class waitlists. Booking alone covers clients booking a provider's appointments or studio classes; clients, providers, paid services and class groups do not imply customers, team, commerce, events or community. Add another pack only for an explicitly requested separate job. Not selling goods (commerce). Reply only with a valid JSON array of pack ids, never an object, invented app name or explanation.",
  },
  {
    id: "customers",
    name: "Customers",
    purpose: "Keep a business's client records, history, invoices, reviews, rewards and signed agreements.",
    pick: "A client book: keep records about clients, such as profiles, visit history and notes, consent, agreements, client invoices, reviews and loyalty. Choose customers for a client-records job, not because another workflow has customers or records transactions. Buying goods and checking out are commerce; reserving appointments is booking. Friends sharing posts, comments and follows belong to social.",
  },
  {
    id: "commerce",
    name: "Commerce",
    purpose:
      "Goods on offer, a basket, an order and its progress, from both sides: the buyer browsing and ordering, and the seller seeing orders come in, moving them on and keeping products up to date. It covers small sellers (a bakery taking pre-orders, a market stall, a maker selling prints). Taking payment is always a service part.",
    pick: "Selling things for money: a shop, a bakery, a stall. Not booking time (booking)",
  },
  {
    id: "money",
    name: "Money",
    purpose:
      'Personal and household money: what is in each account, where it went, what is due, who owes whom, how to clear debts, and how a holding is doing. It never moves money in a first showcase; bank links and payments are service, and "what\'s real?" says so.',
    pick: "The person's own money: balances, budgets, bills, splitting costs, debts and repayment plans. Not a business's sales (commerce)",
  },
  {
    id: "team",
    name: "Team",
    purpose:
      "A small group that works together on a schedule: who is on when, who can cover a gap, hours worked, what the last shift handed over, and requests waiting for a manager. It suits cafés, salons, clinics, volunteer groups and family businesses.",
    pick: "Staff or volunteers: shifts, hours, handovers, approvals. Not a sports squad (sports)",
  },
  {
    id: "data",
    name: "Data",
    purpose:
      "The back office of a small operation: many records at once, sorted and filtered, moved through stages, changed in bulk, and summarised in charts. Any pack component allowed by the README's density rule may be dense.",
    pick: "Running something behind the scenes: tables, boards, reports. Not personal tracking (core)",
  },
  {
    id: "social",
    name: "Social",
    purpose:
      "A small community in one app: a club, a class, a neighbourhood, friends with a shared hobby. People post, react, comment, vote, join challenges and events, and invite others. Everything here needs other people, so the pack is tier people throughout.",
    pick: "People sharing with each other: posts, comments, follows. Not a business's clients (customers)",
  },
  {
    id: "media",
    name: "Media",
    purpose:
      "A library of things to read, hear or watch: articles, books, podcasts, albums, sermons, video courses. The core Player plays one recording; this pack adds what a library needs around it: the reading view, a show's page, episode lists, chapters, a player that follows the person between screens, and saved highlights.",
    pick: "Reading, listening and watching a library. Not one recording on one screen (core Player)",
  },
  {
    id: "learning",
    name: "Learning",
    purpose:
      "Learning something step by step and checking it stuck: lessons, questions with feedback, flashcards with spaced review, a path through units, results and badges, and a student's week of classes and homework.",
    pick: "Teaching and practising: lessons, quizzes, flashcards, classes and homework. Not a team's training rota (team)",
  },
  {
    id: "places",
    name: "Places",
    purpose:
      "Real places and moving between them: a venue's card and opening hours, an address to copy or navigate to, a map with a list beside it, a delivery coming to the door, and the next departures from a stop. Maps and live data need a service.",
    pick: "Where things are and getting there: venues, addresses, deliveries, departures. Not planning a trip (trips)",
  },
] as const;
