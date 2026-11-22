import type { PackProbe } from "..";
import type { PackId } from "../../meta";

export const discoveryProbes = {
  ticketing: [
    {
      kind: "pack",
      idea: "Find existing concerts near me, compare seats by price tier and deal rating, and let me open my scannable passes at the door.",
      expect: ["ticketing"],
    },
    {
      kind: "pack",
      idea: "Let me compare resale seats for live basketball games, buy a pair, and price my unused tickets to list for resale.",
      expect: ["ticketing"],
    },
    {
      kind: "pack",
      idea: "I'm organizing my own charity gala. Track the guest list, send invitations, collect RSVPs and assign seats to our guests.",
      expect: ["events"],
    },
  ],
  dating: [
    {
      kind: "pack",
      idea: "Help me meet someone for a relationship. I want dating prompt profiles, mutual likes and a queue of matches that expire if neither person replies.",
      expect: ["dating"],
    },
    {
      kind: "pack",
      idea: "Let me compare potential dates' values and dealbreakers and offer both of us an icebreaker after a match.",
      expect: ["dating"],
    },
    {
      kind: "pack",
      idea: "My friends want a feed for short posts, photos, comments, likes and follows.",
      expect: ["social"],
    },
  ],
  comics: [
    {
      kind: "pack",
      idea: "I want to scroll through webtoon panels, see when the next chapter drops, and unlock chapters with a daily pass.",
      expect: ["comics"],
    },
    {
      kind: "pack",
      idea: "Keep a shelf of the manga I'm following, let me read right-to-left spreads, and show which chapters are waiting to unlock.",
      expect: ["comics"],
    },
    {
      kind: "pack",
      idea: "Save books and audiobooks in a reading library and show my listening progress and saved passages.",
      expect: ["media"],
    },
  ],
  watch: [
    {
      kind: "pack",
      idea: "Keep track of the TV seasons I'm watching, let me resume episodes, and show what's on the live TV guide tonight.",
      expect: ["watch"],
    },
    {
      kind: "pack",
      idea: "Let me compare showtimes for new films and select open auditorium seats at my local cinema.",
      expect: ["watch"],
    },
    {
      kind: "pack",
      idea: "Play one local video clip with a pause button and scrubber; no catalog, channel guide or queue.",
      expect: [],
    },
  ],
  puzzles: [
    {
      kind: "pack",
      idea: "Give me one five-letter word puzzle each morning. Color the letters by clues and show my guess distribution when I solve it.",
      expect: ["puzzles"],
    },
    {
      kind: "pack",
      idea: "Let me solve today's Sudoku alone, pencil in possible digits and keep my streak.",
      expect: ["puzzles"],
    },
    {
      kind: "pack",
      idea: "At game night we share one phone to roll dice, take turns, and write down each team's round score.",
      expect: ["play"],
    },
  ],
  navigation: [
    {
      kind: "pack",
      idea: "Compare routes to my dog walks by bike or on foot, then guide me turn by turn and show hazards ahead.",
      expect: ["navigation"],
    },
    {
      kind: "pack",
      idea: "Help me follow each bus and train leg to a destination, including transfers and where to walk between stops, with an offline map.",
      expect: ["navigation"],
    },
    {
      kind: "pack",
      idea: "Find dog-friendly cafés and parks on a map with addresses and open hours.",
      expect: ["places"],
    },
  ],
  stays: [
    {
      kind: "pack",
      idea: "Find a place for a weekend away. Compare nightly prices on a date calendar, see room rate options and refund rules, and watch for price drops.",
      expect: ["stays"],
    },
    {
      kind: "pack",
      idea: "I haven't booked my train holiday yet. Compare fares by departure date and shortlist lodgings by price and amenities.",
      expect: ["stays"],
    },
    {
      kind: "pack",
      idea: "I've already booked my hotels and flights. Keep the confirmations, boarding times and packing list in my holiday itinerary.",
      expect: ["trips"],
    },
  ],
  dining: [
    {
      kind: "pack",
      idea: "At our café guests need a menu with allergens and milk add-ons, curbside arrival check-in, and a view of their diner points.",
      expect: ["dining"],
    },
    {
      kind: "pack",
      idea: "Let me reserve a restaurant table for six in the outdoor section or join a live walk-in queue when tables are full.",
      expect: ["dining"],
    },
    {
      kind: "pack",
      idea: "At home I need timed recipe steps, a meal plan, and a grocery list filled from the recipes.",
      expect: ["kitchen"],
    },
  ],
  news: [
    {
      kind: "pack",
      idea: "Follow developing local news with live reporter updates, an alert ticker, and coverage of each story grouped across publishers.",
      expect: ["news"],
    },
    {
      kind: "pack",
      idea: "Build a daily journalism digest with a headline feed by beat, fact coverage compared across different outlets, and outlet follows.",
      expect: ["news"],
    },
    {
      kind: "pack",
      idea: "I need a private shelf for saved audiobooks and podcasts, with playback queues and chapter markers.",
      expect: ["media"],
    },
  ],
  reference: [
    {
      kind: "pack",
      idea: "Help me find a chapter and verse, compare two translations side by side and keep my place in a devotional reading plan.",
      expect: ["reference"],
    },
    {
      kind: "pack",
      idea: "Look up words by sense and pronunciation and browse encyclopedia entries with source citations linked to footnotes.",
      expect: ["reference"],
    },
    {
      kind: "pack",
      idea: "Teach me Japanese through short lessons, graded questions and spaced flashcards.",
      expect: ["learning"],
    },
  ],
} as const satisfies Partial<Record<PackId, readonly PackProbe[]>>;
