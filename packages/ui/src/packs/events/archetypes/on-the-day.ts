import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const on_the_day = {
  id: "on_the_day",
  job: "Admit guests, show the issued pass or find a date",
  defaultLayout: "door",
  layouts: {
    door: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Door"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "d1", c: "Door" },
        { id: "n1", c: "Note" },
      ],
    },
    ticket: {
      writeHints: ["For the single MapPins venue, leave mark and tone null; a pin needs only its label."],
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Ticket"], required: true },
        { allow: ["MapPins"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "t1", c: "Ticket" },
        { id: "m1", c: "MapPins" },
      ],
    },
    date: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["FindDate"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "f1", c: "FindDate" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "on_the_day",
    layout: "door",
    brief:
      "Head the screen Gala check-in. Set up arrivals with ticket scanning and manual check-in; the scanner instruction is 'Scan a Harbour Benefit pass'. Finish with a note saying 'Use the side entrance after 20:00.'",
  },
  {
    kind: "compose",
    archetype: "on_the_day",
    layout: "ticket",
    brief:
      "Add a back header titled Your pass. Show Imani Cole's Adult admission pass, number HB0142, for Harbour Benefit at Harbour Hall on 2027-04-09 at 18:30. Finish with a venue map and a pin for Harbour Hall.",
  },
  {
    kind: "compose",
    archetype: "on_the_day",
    layout: "date",
    brief:
      "Head the screen Find a date. Compare 2027-04-09 and 2027-04-10 in an availability grid. Imani Cole says yes then maybe; Hugo Wells says no then yes. Finish with a Share dates button.",
  },
] satisfies ComposeProbe[];
