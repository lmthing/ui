export const expansionPacks = [
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
    pick: "A club, association or neighbourhood group run by its members: dues, notices, votes, sign-ups, minutes. Member subscriptions and spending votes are governance, not personal finance (money); member sign-ups are not appointments (booking). Not sharing posts (social), not organising one gathering (events), not staff shifts (team)",
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
    pick: "Landlord operations: rental units, dated occupancy, rent charges and receipts, viewings, inspections and meters. Use property alone for those operations. Add inventory for separately requested listings, leases or owned assets, and money for separate personal finances. Not repair and maintenance queues (requests)",
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
] as const;
