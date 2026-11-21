export const discoveryPacks = [
  {
    id: "ticketing",
    name: "Ticketing",
    purpose:
      "Discover, compare, buy, present and resell passes for live shows, games or concerts, including seat prices and mobile ticket wallets.",
    pick: "Use ticketing alone for discovering nearby concerts, comparing seats and presenting passes. Near me is a search filter, not another job. Add places only for a separately requested venue directory, not for ticket listings or seat maps. Not organizing your own event (events), retail checkouts (commerce), or cinema showtimes (watch).",
  },
  {
    id: "dating",
    name: "Dating",
    purpose:
      "Romantic matching: relationship profiles, mutual likes, expiring match queues, compatibility, icebreakers and safety check-ins for dates.",
    pick: "Use for finding or meeting a match, not public posts (social), ordinary direct messages (comms), or simple swipe cards (core).",
  },
  {
    id: "comics",
    name: "Comics",
    purpose:
      "Webtoons and manga: read sequential panels, follow series on a shelf, see weekly release calendars and unlock serialized chapters with coins or wait timers.",
    pick: "Use for sequential visual storytelling and chapter gates. Not prose books or audio (media), or simply showing standalone illustrations (core).",
  },
  {
    id: "watch",
    name: "Watch",
    purpose:
      "Television, film and cinema: multi-season catalogs, live TV guides, resume queues, TV remotes, cinema showtimes and auditorium seat selection.",
    pick: "Use for watching a video catalog, controlling a TV or picking a cinema showing. Not audio or prose libraries (media), live non-cinema ticket markets (ticketing), or playing one local recording (core).",
  },
  {
    id: "puzzles",
    name: "Puzzles",
    purpose:
      "Playable solo puzzles: five-letter word guesses with colored clues, Sudoku with pencil marks, logic and tile grids, and lifeline trivia.",
    pick: "Choose puzzles even for one private daily word game or Sudoku. Guess distributions, streaks and daily cadence are part of the puzzle, not separate domains. Not group or host-led trivia and board games (play), or coursework and exam drills (learning).",
  },
  {
    id: "navigation",
    name: "Navigation",
    purpose:
      "Active routing and mobility: turn-by-turn and lane guidance, route alternatives, transit legs, road hazards, trail elevation, offline maps and passenger ride tracking.",
    pick: "Use navigation alone to compare routes, follow turn-by-turn directions on bike or foot, or make transit transfers. A destination, stop or hazard on that route does not need places. Choose places only for a separate venue, departure-board or parcel-map workflow. Not holiday itineraries (trips) or a driver's job offers (dispatch).",
  },
  {
    id: "stays",
    name: "Stays",
    purpose:
      "Shop for lodging and travel fares before booking: compare nightly prices, fare calendars, room rates, amenities and cancellation policies, and watch for price drops.",
    pick: "Use stays alone for pre-booking fare searches and lodging shortlists. Use trips instead for keeping confirmations, packing or an itinerary. Not appointments and class slots (booking).",
  },
  {
    id: "dining",
    name: "Dining",
    purpose:
      "Restaurant and café customer flows: dietary menus, configurable dishes, curbside or drive-through check-in, tables and walk-in queues, and diner points rewards.",
    pick: "Use for dining out, configurable restaurant orders or a restaurant's tables and walk-in queue. Restaurant reservations and waitlists alone do not need booking or places. Not meals cooked at home (kitchen), ordinary bakery or shop pre-orders (commerce), or a business's client book (customers).",
  },
  {
    id: "news",
    name: "News",
    purpose:
      "Follow journalism and developing stories with attributed headlines, comparisons across outlets, live blogs, breaking tickers, daily digests and publisher follows.",
    pick: "Use for discovering and following current reporting, not personal updates (social), a personal library of already saved newsletters, books or audio (media), or an enduring encyclopedia (reference).",
  },
  {
    id: "reference",
    name: "Reference",
    purpose:
      "Read canonical or structured reference material: scripture verse lookup, study plans, parallel translations, dictionary senses and pronunciation, and cited encyclopedia articles.",
    pick: "Use for looking up words, verses or facts. Not consuming general books or audio (media), graded study (learning), or accounting (books).",
  },
] as const;
