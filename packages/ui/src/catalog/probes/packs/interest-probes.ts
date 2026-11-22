import type { PackProbe } from "..";
import type { PackId } from "../../meta";

export const interestProbes = {
  fantasy: [
    {
      kind: "pack",
      idea: "My friends and I need a fantasy football draft room, budgeted waiver bids and live head-to-head fantasy scores.",
      expect: ["fantasy"],
    },
    {
      kind: "pack",
      idea: "Let me build my fantasy roster from pro players, move players from bench to starters and track points against other managers.",
      expect: ["fantasy"],
    },
    {
      kind: "pack",
      idea: "I manage our real Sunday football club. Schedule fixtures, pick our match lineup and track league standings.",
      expect: ["sports"],
    },
  ],
  studio: [
    {
      kind: "pack",
      idea: "I need to prepare photos of plants for a catalog: compare before and after edits with a wipe, apply a filter preset and queue the exports.",
      expect: ["studio"],
    },
    {
      kind: "pack",
      idea: "Make branded graphics by picking a reusable layout, dropping my own photos into its slots and exporting the results.",
      expect: ["studio"],
    },
    {
      kind: "pack",
      idea: "Help me collect home-remodel inspiration from different sources, save the palettes and pin the references on shared moodboards.",
      expect: ["curation"],
    },
  ],
  curation: [
    {
      kind: "pack",
      idea: "I want a shared moodboard for my balcony makeover. Collect photos as pins, keep their sources and color palettes, and arrange them into a flatlay.",
      expect: ["curation"],
    },
    {
      kind: "pack",
      idea: "Make a visual board of outfit inspiration with a staggered pin grid and a style quiz to discover the kinds of looks I want to save.",
      expect: ["curation"],
    },
    {
      kind: "pack",
      idea: "I need to apply filters to my own photos, reveal the before and after with a swipe, and export the edited images.",
      expect: ["studio"],
    },
  ],
  safety: [
    {
      kind: "pack",
      idea: "Share live locations only with my trusted family circle, tell us when someone arrives at a saved place, and escalate if they miss a timed safety check-in.",
      expect: ["safety"],
    },
    {
      kind: "pack",
      idea: "On my solo evening dog walks I want to start a timed check-in, let my chosen contact see where I am, and hold a button to send an SOS.",
      expect: ["safety"],
    },
    {
      kind: "pack",
      idea: "Give me turn-by-turn cycling guidance with route alternatives, lane cues and alerts about obstacles on the route.",
      expect: ["navigation"],
    },
  ],
  dispatch: [
    {
      kind: "pack",
      idea: "I deliver for several shops. Let me go online in a delivery zone, accept offers before they expire, and record a photo at dropoff.",
      expect: ["dispatch"],
    },
    {
      kind: "pack",
      idea: "Show me which zones need couriers, let me confirm a package pickup with a PIN, and break down my gig payouts by delivery.",
      expect: ["dispatch"],
    },
    {
      kind: "pack",
      idea: "I run the shop staff rota. Assign employee shifts, collect clock-ins and approve hours.",
      expect: ["team"],
    },
  ],
  marketplace: [
    {
      kind: "pack",
      idea: "Help neighbors resell used furniture to one another. Let buyers bid in timed auctions or negotiate an offer, and give sellers a shipping label after a sale.",
      expect: ["marketplace"],
    },
    {
      kind: "pack",
      idea: "I'm selling used clothes from my own closet. Buyers should be able to make offers on bundles; I'll run timed auctions on special pieces.",
      expect: ["marketplace"],
    },
    {
      kind: "pack",
      idea: "My bakery sells trays of bread at fixed prices. Customers browse the shop, fill a cart and check out.",
      expect: ["commerce"],
    },
  ],
  rpg: [
    {
      kind: "pack",
      idea: "Keep my tabletop character's ability modifiers, current hit points, spell slots and gear during a campaign.",
      expect: ["rpg"],
    },
    {
      kind: "pack",
      idea: "Run our tabletop campaign encounters: order characters by initiative, track conditions, and roll each character's specific ability checks.",
      expect: ["rpg"],
    },
    {
      kind: "pack",
      idea: "We share one phone at board game night to roll dice, advance turns and record each team's round totals.",
      expect: ["play"],
    },
  ],
  kids: [
    {
      kind: "pack",
      idea: "My pre-reader needs to tap animal sounds and phonics, follow illustrated read-along pages, and collect a sticker when they finish.",
      expect: ["kids"],
    },
    {
      kind: "pack",
      idea: "I want my young children to switch their own picture profiles, follow a morning routine by tapping icons and earn stickers, with adult settings behind a parent gate.",
      expect: ["kids"],
    },
    {
      kind: "pack",
      idea: "As a parent I need a custody calendar with swap approvals and a screen-time limit for each child.",
      expect: ["parenting"],
    },
  ],
  beauty: [
    {
      kind: "pack",
      idea: "Help me put my morning and evening skincare steps in order, check whether ingredients clash, and track how long each bottle lasts once opened.",
      expect: ["beauty"],
    },
    {
      kind: "pack",
      idea: "I want a personal beauty profile with skin type and undertone, a saved lookbook of shade combinations, and notes on cosmetic ingredients.",
      expect: ["beauty"],
    },
    {
      kind: "pack",
      idea: "Let my salon clients see open times, book a haircut, and join a waitlist for full slots.",
      expect: ["booking"],
    },
  ],
  perks: [
    {
      kind: "pack",
      idea: "Find verified coupon codes across different online stores and track cashback points until I can redeem them for cash.",
      expect: ["perks"],
    },
    {
      kind: "pack",
      idea: "Show me partner offers across several merchants, how much cashback each gives, and my progress toward my first cashout.",
      expect: ["perks"],
    },
    {
      kind: "pack",
      idea: "I own a stationery store. Show regular products, one in-store promo, a cart and a checkout for my shop.",
      expect: ["commerce"],
    },
  ],
} as const satisfies Partial<Record<PackId, readonly PackProbe[]>>;
