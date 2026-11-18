import type { PackId } from "./pack-ids";

export type PackIndexEntry = { id: PackId; name: string; purpose: string; pick: string };

export const packIndex = [
  {
    id: "booking",
    name: "Booking",
    purpose: "Offer services and book appointments, classes and free start times.",
    pick: "Booking time with someone: appointments, classes, slots. Not selling goods (commerce).",
  },
  {
    id: "customers",
    name: "Customers",
    purpose: "Keep a business's client records, history, invoices, reviews, rewards and signed agreements.",
    pick: "A business keeping track of the people it serves: client records, history, invoices and rewards. Past visits alone do not need scheduling (booking). Not people sharing posts, comments and follows with each other (social). Friends sharing with each other belong to social, not a core-only app.",
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
    pick: "Travelling: itineraries, reservations, packing, documents, weather. Not organising an event (events)",
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
  {
    id: "play",
    name: "Play",
    purpose:
      "Tools for playing around one phone: keep a board game's round scores, roll dice, spin for a random choice, take turns, reveal a trivia answer and split the players into teams. It supports the game at the table, not a general game engine, a sports season or a course. No wagers, prizes for money or payments.",
    pick: "Playing a game together: round scores, dice, a spinner, turns, host-led trivia and random teams. Not league fixtures and standings (sports), not graded practice (learning), not household duties (home)",
  },
  {
    id: "requests",
    name: "Requests",
    purpose:
      "An operator takes a reported problem through triage, assigned work, updates and verified resolution. Reports can span visits, have several work orders, wait for parts or information, and reopen after a failed fix.",
    pick: "Requests moving through a service queue: repairs, maintenance, support tickets, work orders. Not booking time (booking), not a simple repair attached to something owned (inventory), not arbitrary records on a board (data)",
  },
  {
    id: "community",
    name: "Community",
    purpose:
      "The continuing work of a member-run group: who belongs and can vote, subscriptions collected by the treasurer, motions decided under the group's rules, contributions people claim, and the agreed record of decisions and actions. Notices use the core; this pack adds governance, not another social feed.",
    pick: "A club, association or neighbourhood group run by its members: dues, notices, votes, sign-ups, minutes. Not sharing posts (social), not organising one gathering (events), not staff shifts (team)",
  },
  {
    id: "projects",
    name: "Projects",
    purpose:
      "Delivering a bounded piece of work: agree what is included, break it into assigned tasks, meet milestone gates, see dependencies across dates, and record the time spent on each task. It serves one person managing their own work first; collaborators and clients do not have to use the app.",
    pick: "Work with deliverables: projects, tasks, milestones, time spent. Not running day-to-day operations (data), not staff shifts (team)",
  },
  {
    id: "paperwork",
    name: "Paperwork",
    purpose:
      "IDs, insurance, tax evidence, certificates and personal contracts, with action dates and proof files. The pack is a local filing cabinet, not a bank, travel wallet, warranty book or client-consent workflow. Its hand-drawn signature pad for personal forms does not promise legally verified e-signing.",
    pick: "Life admin: documents, renewals, receipts, forms to sign and deadlines. Not travel documents (trips), owned things' warranties (inventory), client agreements (customers) or payments to track (money)",
  },
  {
    id: "hiring",
    name: "Hiring",
    purpose:
      "Before someone joins a team, a small employer tracks openings and applicants, reviews evidence, arranges interviews and records offers. A job seeker tracks the same process from the other side. Both can keep records on one phone; this pack does not promise a job board, shared recruiting system or automatic hiring.",
    pick: "Finding people or work: job posts, applicants, interviews, offers and your own applications. Not staff already hired (team), not clients (customers), not a generic kanban (data)",
  },
  {
    id: "property",
    name: "Property",
    purpose:
      "The operating view of rented homes: which independently lettable units are occupied, who owes rent for which period, who is viewing, what condition each room was in, and how meters changed. A landlord or host can keep these records on one phone; tenant accounts, automatic payments and booking-platform sync are not implied. This pack does not replace inventory's Lease or Listing.",
    pick: "Running rented property: units, occupancy, rent, viewings, inspections, meters. Not owned things or one listing or lease (inventory), not repairs and maintenance requests (requests)",
  },
  {
    id: "invest",
    name: "Invest",
    purpose:
      "Following money set aside for the future: what is owned, how its value changes apart from contributions, what income it pays, and how close it brings a savings target. It records investments, not advice or orders to a broker. A first showcase uses local records and dated quotes; live prices need a service.",
    pick: "Investments over time: holdings, allocation, watchlists, performance, dividends, savings goals. Not day-to-day spending and bills (money), not a business's books (books, proposed)",
  },
  {
    id: "books",
    name: "Books",
    purpose:
      "Keeping a small business's books: record money received and spent, retain receipts, separate business costs from owner withdrawals, and understand a period's profit and tax provision. The default is local cash-basis bookkeeping for one business, not banking, certified accounts or automatic tax filing.",
    pick: "A small business's own accounts: income, expenses, profit, tax set aside. Not personal money (money), client invoices (customers), or selling goods (commerce)",
  },
] as const satisfies readonly PackIndexEntry[];
