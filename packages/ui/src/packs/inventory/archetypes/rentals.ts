import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const rentals = {
  id: "rentals",
  job: "My rental places",
  defaultLayout: "listings",
  layouts: {
    listings: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Chips"], required: true },
        { allow: ["List"], required: true, variant: "cards" },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "c1", c: "Chips" },
        { id: "l1", c: "List", style: "cards" },
      ],
    },
    listing: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Gallery"], required: true, variant: "carousel" },
        { allow: ["Listing"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "g1", c: "Gallery", style: "carousel" },
        { id: "l1", c: "Listing" },
      ],
    },
    lease: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Lease"], required: true },
        { allow: ["Timeline"], required: true, variant: "history" },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "l1", c: "Lease" },
        { id: "t1", c: "Timeline", style: "history" },
      ],
    },
    repairs: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Segmented"], required: true },
        { allow: ["List"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Segmented" },
        { id: "l1", c: "List" },
        { id: "b1", c: "Button" },
      ],
    },
    repair: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Request"], required: true },
        { allow: ["Photo"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "r1", c: "Request" },
        { id: "p1", c: "Photo" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "rentals",
    layout: "listings",
    brief:
      "Heading My rentals, All and Available chips, then one tappable directory of rentals in card style: Patio flat opens patio, Trail cottage opens cottage. Only linked names, not full listings.",
  },
  {
    kind: "compose",
    archetype: "rentals",
    layout: "listing",
    brief:
      "Patio flat back heading, a carousel of local:1 and local:2, then a single advertised rental: 950 a month, two beds, one bath, 64 m2, 14 Mill Lane, available 2026-12-01, sunny patio, with contact and save.",
  },
  {
    kind: "compose",
    archetype: "rentals",
    layout: "lease",
    brief:
      "Patio flat back heading, Ana's lease from 2026-01-01 to 2026-12-30 at 950 per month due on day 12 with a 950 deposit, then a history timeline of handover on 2026-01-01 and key replacement on 2026-05-03.",
  },
  {
    kind: "compose",
    archetype: "rentals",
    layout: "repairs",
    brief:
      "Heading Rental repairs, Open/Fixed segmented control, an ordinary tappable list of faults linking Patio tap to tap and Yard latch to latch, and a Report repair button. No triage or work orders.",
  },
  {
    kind: "compose",
    archetype: "rentals",
    layout: "repair",
    brief:
      "Back heading Patio tap, one urgent repair summary for Patio flat, booked with Ana, update at 09:15 saying Tenant turned off the tap. Below it place a separate photo of the affected tap using local:1.",
  },
] satisfies ComposeProbe[];
