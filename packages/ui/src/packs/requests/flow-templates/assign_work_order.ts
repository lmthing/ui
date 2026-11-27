import type { FlowTemplate } from "../../../catalog/flow-templates";
import { prompt } from "../../../entry/flow-assign_work_order.generated";

const garden = {
  names: { requester: "Nia", dispatcher: "Mina", worker: "Ren" },
  record: {
    subject: "Greenhouse latch",
    reference: "WO-108",
    window: "Fri, 9 AM to noon",
    result: "Latch replaced",
  },
};

export const assignWorkOrder: FlowTemplate = {
  ...prompt,
  id: "assign_work_order",
  title: "Assign and close a work order",
  nameSlots: ["requester", "dispatcher", "worker"],
  recordShape: { subject: "string", reference: "string", window: "string", result: "string" },
  journeys: [
    {
      role: "requester",
      id: "track_service",
      name: "Request work and see the result",
      goal: "{name.requester} reports {record.subject} and sees the work result on the same request.",
      steps: [
        {
          id: "submit",
          see: "Check the details of {record.subject} before sending request {record.reference}.",
          do: "Tap Send request.",
          hands_off_to: { role: "dispatcher", step: "assign" },
          layout: { components: ["KeyValue"] },
          states: ["waiting", "error"],
          preview: {
            title: "Review request",
            action: "Send request",
            fields: ["subject", "reference"],
            messages: {
              waiting: "Sending your request. No worker is assigned yet.",
              error: "The request was not sent. Check the details and try again.",
            },
          },
        },
        {
          id: "closed",
          see: "{record.reference} is closed. Work result: {record.result}.",
          layout: { components: ["Success"] },
          states: ["success"],
          preview: { title: "Work order closed", fields: ["subject", "reference", "result"] },
        },
      ],
    },
    {
      role: "dispatcher",
      id: "route_and_verify",
      name: "Assign and verify the work",
      goal: "{name.dispatcher} assigns {record.reference} and verifies the returned outcome.",
      steps: [
        {
          id: "assign",
          see: "Request {record.reference} for {record.subject} is unassigned. Review assignment to {name.worker} for {record.window}.",
          do: "Tap Assign work order.",
          hands_off_to: { role: "worker", step: "job" },
          layout: { components: ["KeyValue"] },
          states: ["waiting", "error"],
          preview: {
            title: "Assign work order",
            action: "Assign work order",
            fields: ["subject", "reference", "window"],
            messages: { error: "Assignment did not save. The request is still unassigned." },
          },
        },
        {
          id: "verify",
          see: "{name.worker} submitted {record.result} on {record.reference}. Check the outcome before closing.",
          do: "Tap Close and notify.",
          hands_off_to: { role: "requester", step: "closed" },
          layout: { components: ["KeyValue"] },
          states: ["waiting", "error"],
          preview: {
            title: "Verify work",
            action: "Close and notify",
            fields: ["subject", "reference", "result"],
            messages: { error: "The work order remains open. The requester was not notified." },
          },
        },
      ],
    },
    {
      role: "worker",
      id: "finish_work",
      name: "Complete an assigned work order",
      goal: "{name.worker} submits the outcome of {record.reference} for verification.",
      steps: [
        {
          id: "job",
          see: "Your assigned job is {record.subject}, {record.reference}, scheduled for {record.window}.",
          do: "Tap Review work outcome after doing the work.",
          layout: { components: ["KeyValue"] },
          states: ["waiting"],
          preview: {
            title: "Assigned job",
            action: "Review work outcome",
            fields: ["subject", "reference", "window"],
          },
        },
        {
          id: "submit_outcome",
          see: "Send {record.result} for {record.reference} to {name.dispatcher} for review. Sending does not close it.",
          do: "Tap Submit outcome.",
          hands_off_to: { role: "dispatcher", step: "verify" },
          layout: { components: ["KeyValue"] },
          states: ["waiting", "error"],
          preview: {
            title: "Review work outcome",
            action: "Submit outcome",
            fields: ["reference", "result"],
            messages: { error: "The outcome was not submitted. The job is still assigned to you." },
          },
        },
      ],
    },
  ],
  examples: [
    { id: "garden", ...garden },
    {
      id: "walks",
      names: { requester: "Sam", dispatcher: "Jules", worker: "Noah" },
      record: {
        subject: "Leash station repair",
        reference: "WO-216",
        window: "Mon, 1 to 3 PM",
        result: "Bracket secured",
      },
    },
  ],
  probes: {
    pick: [
      {
        request:
          "A member reports a repair. Our dispatcher assigns the work order to a tech, verifies the tech's result and lets the member see it closed.",
        expect: "assign_work_order",
      },
      {
        request:
          "Let someone report a problem to its single resolver, who fixes it and notifies them. Nobody assigns it to someone else.",
        expect: "report_issue",
      },
    ],
    fill: [
      {
        request:
          "Nia reports Greenhouse latch as WO-108. Dispatcher Mina assigns Ren the window Fri, 9 AM to noon. The outcome is Latch replaced.",
        expect: garden,
      },
    ],
  },
};
