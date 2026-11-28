import type { FlowTemplate } from "../flow-template";
import { prompt } from "../../../entry/flow-complete_form.generated";

export const completeForm: FlowTemplate = {
  ...prompt,
  id: "complete_form",
  title: "Complete a multi-step form",
  nameSlots: [],
  recordShape: {
    form: "string",
    subject: "string",
    details: "string",
    reference: "string",
    destination: "string",
  },
  journeys: [
    {
      role: "applicant",
      id: "submit_form",
      name: "Fill and send a form",
      goal: "Send {record.form} to {record.destination} under {record.reference}.",
      steps: [
        {
          id: "subject",
          see: "Start {record.form} by naming what it concerns.",
          do: "Continue to the details.",
          layout: { components: ["Steps", "Field"] },
          states: ["empty", "error"],
          preview: {
            title: "{record.form}",
            action: "Continue to details",
            fields: ["subject"],
            progress: { at: 1, count: 3 },
            messages: { error: "Enter a subject before continuing." },
          },
        },
        {
          id: "details",
          see: "Add the details {record.destination} needs about {record.subject}.",
          do: "Review the form before sending.",
          layout: { components: ["Steps", "Field"] },
          states: ["empty", "error"],
          preview: {
            title: "Add details",
            action: "Review form",
            fields: ["details"],
            back: true,
            progress: { at: 2, count: 3 },
            messages: { error: "Add the details before continuing." },
          },
        },
        {
          id: "review",
          see: "{record.destination} will receive one submission for {record.reference}. Nothing has been sent yet.",
          do: "Submit the form or go back to change the details.",
          layout: { components: ["Steps", "KeyValue"] },
          states: ["waiting", "error"],
          preview: {
            title: "Review submission",
            action: "Submit form",
            back: true,
            fields: ["subject", "details", "reference"],
            progress: { at: 3, count: 3 },
            messages: {
              waiting: "Sending your form. We're waiting for acknowledgment.",
              error: "The form wasn't sent. Your answers are still here.",
            },
          },
        },
        {
          id: "submitted",
          see: "{record.destination} received {record.form}. Keep {record.reference} for follow-up.",
          layout: { components: ["Success"] },
          states: ["success"],
          preview: { title: "Form submitted", fields: ["reference", "subject", "destination"] },
        },
      ],
    },
  ],
  examples: [
    {
      id: "market_application",
      names: {},
      record: {
        form: "Market stall application",
        subject: "Stoneware tableware",
        details: "2 m stall; no power needed",
        reference: "STALL-92",
        destination: "Market office",
      },
    },
    {
      id: "archive_intake",
      names: {},
      record: {
        form: "Archive intake form",
        subject: "Mill renovation prints",
        details: "8 prints, 1962–1968",
        reference: "ARC-340",
        destination: "City archive",
      },
    },
  ],
  probes: {
    pick: [
      {
        request:
          "Split the stall application into subject, details and a review screen. Keep my previous answers if I go back, then show my submission reference.",
        expect: "complete_form",
      },
      {
        request: "Let me choose an open time for a fitting, confirm it and reschedule it later.",
        expect: "book_slot",
      },
    ],
    fill: [
      {
        request:
          "Use 'Market stall application', 'Stoneware tableware', '2 m stall; no power needed', reference STALL-92 and destination Market office.",
        expect: {
          names: {},
          record: { form: "Market stall application", subject: "Stoneware tableware", reference: "STALL-92" },
        },
      },
    ],
  },
};
