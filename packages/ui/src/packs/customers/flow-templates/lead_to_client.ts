import type { FlowTemplate } from "../../../catalog/flow-templates";
import { prompt } from "../../../entry/flow-lead_to_client.generated";

const garden = {
  names: { owner: "Ren", prospect: "Mina" },
  record: { service: "Balcony plant care", reference: "L-204", estimate: "$85" },
};

export const leadToClient: FlowTemplate = {
  ...prompt,
  id: "lead_to_client",
  title: "Lead to client",
  nameSlots: ["owner", "prospect"],
  recordShape: { service: "string", reference: "string", estimate: "string" },
  journeys: [
    {
      role: "owner",
      id: "qualify_lead",
      name: "Qualify an inquiry",
      goal: "{name.owner} turns {name.prospect}'s inquiry into a client only after agreement.",
      steps: [
        {
          id: "inbox",
          see: "{name.prospect} asked about {record.service}. This is new inquiry {record.reference}.",
          do: "Tap Review inquiry.",
          layout: { components: ["List"] },
          states: ["empty", "waiting"],
          preview: {
            title: "New inquiries",
            action: "Review inquiry",
            fields: ["service", "reference"],
            messages: { empty: "No new inquiries need review.", waiting: "Loading inquiries." },
          },
        },
        {
          id: "proposal",
          see: "Review {record.service} and the {record.estimate} estimate before sharing proposal {record.reference}.",
          do: "Tap Send proposal.",
          hands_off_to: { role: "prospect", step: "review" },
          layout: { components: ["KeyValue"] },
          states: ["waiting", "error"],
          preview: {
            title: "Review proposal",
            action: "Send proposal",
            fields: ["service", "estimate", "reference"],
            messages: {
              waiting: "Sending the proposal. The inquiry is not a client yet.",
              error: "The proposal was not sent. The inquiry remains open.",
            },
          },
        },
        {
          id: "convert",
          see: "{name.prospect} accepted proposal {record.reference}. Keep the inquiry history when creating their client record.",
          do: "Tap Create client.",
          layout: { components: ["KeyValue"] },
          states: ["waiting", "error"],
          preview: {
            title: "Accepted proposal",
            action: "Create client",
            fields: ["service", "estimate", "reference"],
            messages: { error: "The client record could not be saved. The proposal is still accepted." },
          },
        },
        {
          id: "client",
          see: "{name.prospect} is now a client for {record.service}. Proposal {record.reference} remains linked.",
          layout: { components: ["Success"] },
          states: ["success"],
          preview: { title: "Client created", fields: ["service", "reference"] },
        },
      ],
    },
    {
      role: "prospect",
      id: "decide_proposal",
      name: "Decide on the proposal",
      goal: "{name.prospect} reviews the work and price before deciding.",
      steps: [
        {
          id: "review",
          see: "{name.owner} proposed {record.service} for {record.estimate}. Reference {record.reference}.",
          do: "Decide whether to proceed.",
          next: null,
          choices: [
            { label: "Accept proposal", step: "accept" },
            { label: "Decline proposal", step: "decline" },
          ],
          layout: { components: ["KeyValue"] },
          states: ["waiting"],
          preview: { title: "Your proposal", fields: ["service", "estimate", "reference"] },
        },
        {
          id: "accept",
          see: "Confirm acceptance of {record.service} for {record.estimate}. This is not a payment.",
          do: "Tap Send acceptance.",
          hands_off_to: { role: "owner", step: "convert" },
          layout: { components: ["KeyValue"] },
          states: ["error"],
          preview: {
            title: "Confirm acceptance",
            action: "Send acceptance",
            fields: ["service", "estimate", "reference"],
            messages: { error: "Acceptance was not sent. Nothing has changed." },
          },
        },
        {
          id: "decline",
          see: "Decline proposal {record.reference}; you will not become a client for this work.",
          do: "Tap Confirm decline.",
          layout: { components: ["KeyValue"] },
          states: ["error"],
          preview: {
            title: "Confirm decline",
            action: "Confirm decline",
            fields: ["service", "reference"],
            messages: { error: "The decline was not sent. The proposal is still open." },
          },
        },
        {
          id: "declined",
          see: "Proposal {record.reference} was declined. No client record or payment was created.",
          layout: { components: ["Success"] },
          states: ["success"],
          preview: { title: "Proposal declined", fields: ["reference"] },
        },
      ],
    },
  ],
  examples: [
    { id: "garden", ...garden },
    {
      id: "walks",
      names: { owner: "Jules", prospect: "Noah" },
      record: { service: "Weekly dog walks", reference: "L-551", estimate: "$60" },
    },
  ],
  probes: {
    pick: [
      {
        request:
          "I need to qualify new customer inquiries, send a price and scope, and only create a client after they accept.",
        expect: "lead_to_client",
      },
      {
        request: "Let an existing client pay an issued invoice and then download their receipt.",
        expect: "pay_receipt",
      },
    ],
    fill: [
      {
        request: "Ren will send Mina proposal L-204 for Balcony plant care. The estimate is $85.",
        expect: garden,
      },
    ],
  },
};
