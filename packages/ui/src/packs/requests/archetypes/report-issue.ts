import { placeholderTitle, type ArchetypeMeta, type ComposeProbe } from "../../../catalog";

export const report_issue = {
  id: "report_issue",
  job: "Describe and submit a problem",
  defaultLayout: "requests_intake",
  layouts: {
    requests_intake: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Field"], required: true, variant: "choice" },
        { allow: ["Field"], required: true },
        { allow: ["Choice"], required: true },
        { allow: ["Composer"], required: true, variant: "entry" },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "f1", c: "Field", kind: "choice", options: [placeholderTitle(0), placeholderTitle(1)] },
        { id: "f2", c: "Field" },
        { id: "c1", c: "Choice" },
        { id: "m1", c: "Composer", style: "entry" },
        { id: "b1", c: "Button" },
      ],
    },
    requests_evidence: {
      writeHints: [
        "The photo and submission belong to the same intake draft; do not overwrite the description.",
      ],
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Field"], required: true, variant: "photo" },
        { allow: ["Note"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "f1", c: "Field", kind: "photo" },
        { id: "n1", c: "Note" },
        { id: "b1", c: "Button" },
      ],
    },
    requests_submitted: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Success"], required: true },
        { allow: ["Card"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Success" },
        { id: "d1", c: "Card" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "report_issue",
    layout: "requests_intake",
    brief:
      "Build Spoke’s problem intake: a heading, a category dropdown with Brakes and Drivetrain, a short place field, a separate urgency choice with Normal and Urgent, a multiline entry for the description, and a Continue button.",
  },
  {
    kind: "compose",
    archetype: "report_issue",
    layout: "requests_evidence",
    brief:
      "Build the evidence step with a back heading, a photo field, a note saying photos are optional, and a Submit report button.",
  },
  {
    kind: "compose",
    archetype: "report_issue",
    layout: "requests_submitted",
    brief:
      "After submitting the request, use a heading, a success confirmation, one card for report SR-41 about the slipping chain, and a button to view the report.",
  },
] satisfies ComposeProbe[];
