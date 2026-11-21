import type { PackProbe } from "..";
import type { PackId } from "../../meta";

export const connectionProbes = {
  comms: [
    {
      kind: "pack",
      idea: "A small dog-walking co-op needs an inbox for several ongoing conversations, separate walker channels, and a lobby before group calls.",
      expect: ["comms"],
    },
    {
      kind: "pack",
      idea: "I want a phone dialer with T9 contact search, missed-call history, and a visual voicemail inbox.",
      expect: ["comms"],
    },
    {
      kind: "pack",
      idea: "Friends post pictures of their dogs to a feed, then like, comment, and follow each other.",
      expect: ["social"],
    },
  ],
  assistant: [
    {
      kind: "pack",
      idea: "Give me a workspace to chat with an AI about my plant notes, see the sources it cites, and open the care guide it generates as a separate artifact.",
      expect: ["assistant"],
    },
    {
      kind: "pack",
      idea: "I want a voice conversation with an AI that keeps the streamed answers, tool-call traces, and generated drafts for each thread.",
      expect: ["assistant"],
    },
    {
      kind: "pack",
      idea: "I want a human inbox with separate threads for each walker, a contact directory, and missed-call history.",
      expect: ["comms"],
    },
  ],
  workspace: [
    {
      kind: "pack",
      idea: "Keep our co-op's cloud folders and structured handbook together. Give reviewers comment access and let the editor restore an earlier version of a wiki page.",
      expect: ["workspace"],
    },
    {
      kind: "pack",
      idea: "Our volunteers need one shared folder tree with storage quota, per-folder link permissions, and version history for the documents.",
      expect: ["workspace"],
    },
    {
      kind: "pack",
      idea: "Browse the files on my phone, see how much space they take, and move private items to a locked local folder.",
      expect: ["utilities"],
    },
  ],
  utilities: [
    {
      kind: "pack",
      idea: "Make me a pocket toolkit with a scientific calculator, offline length and volume conversion, and a latency and bandwidth meter.",
      expect: ["utilities"],
    },
    {
      kind: "pack",
      idea: "On my phone, create a QR from any text I paste, inspect decoded codes, and browse and move local files.",
      expect: ["utilities"],
    },
    {
      kind: "pack",
      idea: "Give me an authenticator with rotating sign-in codes, a password vault and single-use recovery codes.",
      expect: ["security"],
    },
  ],
  security: [
    {
      kind: "pack",
      idea: "Keep rotating sign-in codes and backup recovery codes for my accounts, and ask me to confirm number-match sign-ins.",
      expect: ["security"],
    },
    {
      kind: "pack",
      idea: "Help me secure my accounts with a locked passkey and password vault, a passphrase generator and a list of reused passwords.",
      expect: ["security"],
    },
    {
      kind: "pack",
      idea: "File scans of my household IDs and insurance certificates, then remind me of their renewal dates.",
      expect: ["paperwork"],
    },
  ],
  auto: [
    {
      kind: "pack",
      idea: "I keep two cars. Show odometer-based service history, fuel fill-ups, tire pressures and a plain-language view of OBD codes.",
      expect: ["auto"],
    },
    {
      kind: "pack",
      idea: "Help me compare used cars' odometer readings and service histories, then show each car's VIN report before I buy.",
      expect: ["auto"],
    },
    {
      kind: "pack",
      idea: "Show my connected home lights and thermostat, with room controls and saved home-device scenes.",
      expect: ["home"],
    },
  ],
  medical: [
    {
      kind: "pack",
      idea: "Make me a patient portal for my lab panels with reference intervals, insurance claim explanations, and pharmacy refill requests.",
      expect: ["medical"],
    },
    {
      kind: "pack",
      idea: "At my clinic let a patient check in for a telehealth visit, review their immunization record, and see prescriptions available for refill.",
      expect: ["medical"],
    },
    {
      kind: "pack",
      idea: "Keep a private personal log of my gym sets, rest intervals and the pills I remembered to take.",
      expect: ["health"],
    },
  ],
  weather: [
    {
      kind: "pack",
      idea: "I need just a local forecast app: hourly rain and wind, a five-day temperature range, a radar loop and severe weather alerts.",
      expect: ["weather"],
    },
    {
      kind: "pack",
      idea: "Compare air quality, pollen and UV by hour for my saved cities, and show sunrise and sunset times.",
      expect: ["weather"],
    },
    {
      kind: "pack",
      idea: "Plan a rail holiday with hotel confirmations, a day-by-day itinerary and a packing list.",
      expect: ["trips"],
    },
  ],
  realestate: [
    {
      kind: "pack",
      idea: "I'm apartment hunting. Put asking rents on map pins, let me compare saved listings, and alert me when a matching flat gets listed.",
      expect: ["realestate"],
    },
    {
      kind: "pack",
      idea: "My partner and I are buying our first home. Compare asking prices, monthly mortgage estimates including tax and insurance, and inspection and tour dates for the homes we shortlist.",
      expect: ["realestate"],
    },
    {
      kind: "pack",
      idea: "I already manage rented flats. Show me occupied units, monthly rent due, collected receipts, and move-in inspection notes.",
      expect: ["property"],
    },
  ],
  parenting: [
    {
      kind: "pack",
      idea: "Let two parents manage a custody calendar, approve swaps and record shared child expenses.",
      expect: ["parenting"],
    },
    {
      kind: "pack",
      idea: "As an expectant parent I want gestational weeks, a kick counter and a record of contractions, then a chart of my baby's growth percentiles.",
      expect: ["parenting"],
    },
    {
      kind: "pack",
      idea: "Our flatmates need a rotating chore schedule, with whose turn it is to wash dishes, take out bins and water the plants.",
      expect: ["home"],
    },
  ],
} as const satisfies Partial<Record<PackId, readonly PackProbe[]>>;
