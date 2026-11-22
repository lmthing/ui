import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const request_detail = {
  id: "request_detail",
  job: "Follow a request through verified resolution",
  defaultLayout: "requests_overview",
  layouts: {
    requests_overview: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Card"], required: true },
        { allow: ["KeyValue"], required: true },
        { allow: ["SlaPolicy"], required: false },
        { allow: ["List"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "d1", c: "Card" },
        { id: "k1", c: "KeyValue" },
        { id: "l1", c: "List" },
        { id: "b1", c: "Button" },
      ],
    },
    requests_updates: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Card"], required: true },
        { allow: ["CannedReplies"], required: false },
        { allow: ["RequestThread"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "d1", c: "Card" },
        { id: "t1", c: "RequestThread" },
      ],
    },
    requests_work: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["KeyValue"], required: true },
        { allow: ["WorkOrder"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "k1", c: "KeyValue" },
        { id: "w1", c: "WorkOrder" },
        { id: "n1", c: "Note" },
      ],
    },
    requests_resolution: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["RequestResolution"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "r1", c: "RequestResolution" },
        { id: "n1", c: "Note" },
      ],
    },
    requests_feedback: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Scale"], required: true, variant: "stars" },
        { allow: ["Composer"], required: true, variant: "entry" },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "s1", c: "Scale", style: "stars" },
        { id: "m1", c: "Composer", style: "entry" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "request_detail",
    layout: "requests_overview",
    brief:
      "Show a back heading, a card summarising the slipping chain report, key/value facts for priority and promised due date, a tappable list linking the work order and updates, and a button to view the latest update.",
  },
  {
    kind: "compose",
    archetype: "request_detail",
    layout: "requests_updates",
    brief:
      "Show a back heading, the slipping chain report summary card, then a request thread for SR-41 with Ella's requester-visible message at 10:00 on 2026-11-19 saying the part is due tomorrow, followed by an internal status change from working to waiting by Ella at 10:10.",
  },
  {
    kind: "compose",
    archetype: "request_detail",
    layout: "requests_work",
    brief:
      "Show a back heading, key/value facts for one repair, work order WO-12 for SR-41 Replace the chain (status working, 20 minutes recorded, one required test ride still unchecked and one 10-speed chain used), then a short note about timing the test ride.",
  },
  {
    kind: "compose",
    archetype: "request_detail",
    layout: "requests_resolution",
    brief:
      "Show a back heading, a proposed repaired outcome for SR-41 summarising the chain replacement with a completed check called No slipping under load and photo local:2, then a note that a requester can reopen if the issue comes back.",
  },
  {
    kind: "compose",
    archetype: "request_detail",
    layout: "requests_feedback",
    brief:
      "Ask for feedback with a back heading, a star rating scale, a multiline entry for optional feedback and a Send feedback button.",
  },
] satisfies ComposeProbe[];
