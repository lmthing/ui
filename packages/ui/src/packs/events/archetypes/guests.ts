import { photo, placeholderTitle, type ArchetypeMeta, type ComposeProbe } from "../../../catalog";

const neutralPhoto = photo.parse(`lib:${placeholderTitle(0).toLowerCase().replace(/ /g, "_")}`);

export const guests = {
  id: "guests",
  job: "Track invitations, seat guests and collect replies",
  defaultLayout: "list",
  layouts: {
    list: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Chips"], required: true },
        { allow: ["GuestList"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "c1", c: "Chips" },
        { id: "g1", c: "GuestList" },
      ],
    },
    seating: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Stats"], required: true },
        { allow: ["Seating"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Stats" },
        { id: "s2", c: "Seating" },
      ],
    },
    reply: {
      writeHints: ['Use Hero with media "cover" and a photo reference (not style "photo").'],
      recipe: [
        { allow: ["Hero"], required: true },
        { allow: ["KeyValue"], required: true },
        { allow: ["MapPins"], required: true },
        { allow: ["RSVP"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Hero", media: "cover", photo: neutralPhoto },
        { id: "k1", c: "KeyValue" },
        { id: "m1", c: "MapPins" },
        { id: "r1", c: "RSVP" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "guests",
    layout: "list",
    brief:
      "Head the screen Wedding guests, add All and Waiting filter chips, then the Shah household's invitations: Ruth Shah yes with one extra guest, open ruth; Deepa Shah waiting with no extra guests, open deepa.",
  },
  {
    kind: "compose",
    archetype: "guests",
    layout: "seating",
    brief:
      "Head the screen Seating plan. Show two summary stats, Seated 1 and Unseated 1. Draw round Oak with eight seats and Ruth Shah seated; Deepa Shah is in the unseated tray.",
  },
  {
    kind: "compose",
    archetype: "guests",
    layout: "reply",
    brief: `Begin with a wide cover photo ${neutralPhoto} and headline Ruth and Sam. Show label/value facts Dress code: Garden party and Doors: 17:00. Add a map with one pin Harbour Hall. Then let the guest reply to Ruth and Sam's wedding on 2027-06-12, no answer yet, up to one companion and one of two meals: Lemon chicken or Roast squash.`,
  },
] satisfies ComposeProbe[];
