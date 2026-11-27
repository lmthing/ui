import type { FlowTemplate } from "../flow-template";
import { prompt } from "../../../entry/flow-request_approve.generated";

export const requestApprove: FlowTemplate = {
  ...prompt,
  id: "request_approve",
  title: "Request and approve",
  nameSlots: ["requester", "approver"],
  recordShape: {
    request: "string",
    reference: "string",
    reason: "string",
  },
  journeys: [
    {
      role: "requester",
      id: "submit_request",
      name: "Get a decision",
      goal: "{name.requester} sees what {name.approver} decided about {record.request}.",
      steps: [
        {
          id: "draft",
          see: "The request form asks what you want approved.",
          do: "Tap Send request",
          layout: {
            components: ["Note", "Field"],
          },
          states: ["empty", "error"],
          preview: {
            title: "New request",
            action: "Send request",
            fields: ["request"],
            messages: {
              error: "Enter what you need before you send this request.",
            },
          },
        },
        {
          id: "pending",
          see: "{record.reference} is with {name.approver} for review.",
          do: "Tap Open for review",
          hands_off_to: {
            role: "approver",
            step: "review",
          },
          layout: {
            components: ["Note"],
          },
          states: ["waiting"],
          preview: {
            title: "Awaiting a decision",
            action: "Open for review",
          },
        },
        {
          id: "approved",
          see: "{name.approver} approved {record.reference}: {record.request}.",
          next: null,
          layout: {
            components: ["Success"],
          },
          states: ["success"],
          preview: {
            title: "Request approved",
            fields: ["reference", "request"],
          },
        },
        {
          id: "rejected",
          see: "{name.approver} declined {record.reference}. Reason: {record.reason}.",
          next: null,
          layout: {
            components: ["KeyValue"],
          },
          states: ["error"],
          preview: {
            title: "Request declined",
            fields: ["reference", "reason"],
          },
        },
      ],
    },
    {
      role: "approver",
      id: "decide_request",
      name: "Review a request",
      goal: "{name.approver} can make and explain a decision on {record.reference}.",
      steps: [
        {
          id: "review",
          see: "{name.requester} asked for {record.request}. Review {record.reference} before deciding.",
          do: "Choose the next action.",
          next: null,
          choices: [
            {
              label: "Approve",
              step: "approve",
            },
            {
              label: "Decline",
              step: "reason",
            },
          ],
          layout: {
            components: ["KeyValue"],
          },
          states: ["waiting"],
          preview: {
            title: "Review request",
            fields: ["request", "reference"],
          },
        },
        {
          id: "approve",
          see: "Approve {record.reference} and notify {name.requester}.",
          do: "Tap Confirm approval",
          hands_off_to: {
            role: "requester",
            step: "approved",
          },
          layout: {
            components: ["Note"],
          },
          states: ["waiting"],
          preview: {
            title: "Approve request",
            action: "Confirm approval",
          },
        },
        {
          id: "reason",
          see: "Add the reason {name.requester} will see for declining {record.reference}.",
          do: "Tap Send decision",
          hands_off_to: {
            role: "requester",
            step: "rejected",
          },
          layout: {
            components: ["Note", "Field"],
          },
          states: ["empty", "error"],
          preview: {
            title: "Reason for declining",
            action: "Send decision",
            fields: ["reason"],
            messages: {
              error: "Enter a reason so the requester knows what to change.",
            },
          },
        },
      ],
    },
  ],
  examples: [
    {
      id: "equipment",
      names: {
        requester: "Kai",
        approver: "Priya",
      },
      record: {
        request: "Equipment loan",
        reference: "RQ-412",
        reason: "Already reserved",
      },
    },
    {
      id: "shift",
      names: {
        requester: "Ira",
        approver: "Ren",
      },
      record: {
        request: "Shift swap",
        reference: "RQ-538",
        reason: "No coverage available",
      },
    },
  ],
  probes: {
    pick: [
      {
        request:
          "Let a team member send a request for sign-off. A manager can approve it or turn it down with an explanation.",
        expect: "request_approve",
      },
      {
        request: "Let people file a problem, assign it to support and tell them when it was fixed.",
        expect: "report_issue",
      },
    ],
    fill: [
      {
        request:
          "I’m Kai. Send a request titled 'Equipment loan' to Priya under RQ-412. On the declined path, show the reason 'Already reserved'.",
        expect: {
          names: {
            requester: "Kai",
            approver: "Priya",
          },
          record: {
            request: "Equipment loan",
            reference: "RQ-412",
            reason: "Already reserved",
          },
        },
      },
    ],
  },
};
