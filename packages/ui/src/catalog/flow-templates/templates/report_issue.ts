import type { FlowTemplate } from "../flow-template";
import { prompt } from "../../../entry/flow-report_issue.generated";

export const reportIssue: FlowTemplate = {
  ...prompt,
  id: "report_issue",
  title: "Report and resolve",
  nameSlots: ["reporter", "resolver"],
  recordShape: {
    issue: "string",
    reference: "string",
    resolution: "string",
  },
  journeys: [
    {
      role: "reporter",
      id: "report_problem",
      name: "Report a problem",
      goal: "{name.reporter} receives a resolution for {record.reference}.",
      steps: [
        {
          id: "describe",
          see: "Describe what went wrong so it can be reproduced or located.",
          do: "Tap Review report",
          layout: {
            components: ["Note", "Field"],
          },
          states: ["empty", "error"],
          preview: {
            title: "Describe the issue",
            action: "Review report",
            fields: ["issue"],
            messages: {
              error: "Add a short description before continuing.",
            },
          },
        },
        {
          id: "add_context",
          see: "You can include extra context if it will help someone find the problem.",
          do: "Tap Continue",
          optional: true,
          layout: {
            components: ["Note"],
          },
          states: ["empty"],
          preview: {
            title: "Add context",
            action: "Continue",
          },
        },
        {
          id: "submit",
          see: "{record.issue} will be filed under {record.reference} for {name.resolver}.",
          do: "Tap Send report",
          hands_off_to: {
            role: "resolver",
            step: "triage",
          },
          layout: {
            components: ["KeyValue"],
          },
          states: ["waiting"],
          preview: {
            title: "Review report",
            action: "Send report",
            fields: ["issue", "reference"],
          },
        },
        {
          id: "resolved",
          see: "{record.reference} was resolved by {name.resolver}: {record.resolution}.",
          next: null,
          layout: {
            components: ["Success"],
          },
          states: ["success"],
          preview: {
            title: "Issue resolved",
            fields: ["reference", "resolution"],
          },
        },
      ],
    },
    {
      role: "resolver",
      id: "resolve_problem",
      name: "Resolve a report",
      goal: "{name.resolver} records what happened and returns the result.",
      steps: [
        {
          id: "triage",
          see: "{name.reporter} reported {record.issue}. Its reference is {record.reference}.",
          do: "Tap Start work",
          layout: {
            components: ["KeyValue"],
          },
          states: ["waiting", "error"],
          preview: {
            title: "New issue report",
            action: "Start work",
            fields: ["issue", "reference"],
            messages: {
              error: "This report is already assigned. Reload before taking it.",
            },
          },
        },
        {
          id: "finish",
          see: "Describe what fixed {record.issue} so the reporter can tell whether it is resolved.",
          do: "Tap Resolve and notify",
          hands_off_to: {
            role: "reporter",
            step: "resolved",
          },
          layout: {
            components: ["Note", "Field"],
          },
          states: ["empty", "error"],
          preview: {
            title: "Record the resolution",
            action: "Resolve and notify",
            fields: ["resolution"],
            messages: {
              error: "Add the fix before closing this report.",
            },
          },
        },
      ],
    },
  ],
  examples: [
    {
      id: "cabinet",
      names: {
        reporter: "Uma",
        resolver: "Eli",
      },
      record: {
        issue: "Loose cabinet hinge",
        reference: "IS-480",
        resolution: "Hinge tightened",
      },
    },
    {
      id: "light",
      names: {
        reporter: "Sol",
        resolver: "Nia",
      },
      record: {
        issue: "Hall light out",
        reference: "IS-582",
        resolution: "Lamp replaced",
      },
    },
  ],
  probes: {
    pick: [
      {
        request: "Let a resident report a problem, let support fix it, and show the resident what was done.",
        expect: "report_issue",
      },
      {
        request: "Send time-off requests to a manager for a yes or no decision.",
        expect: "request_approve",
      },
    ],
    fill: [
      {
        request:
          "Uma reports a Loose cabinet hinge to Eli under IS-480. The final resolution is Hinge tightened.",
        expect: {
          names: {
            reporter: "Uma",
            resolver: "Eli",
          },
          record: {
            issue: "Loose cabinet hinge",
            reference: "IS-480",
            resolution: "Hinge tightened",
          },
        },
      },
    ],
  },
};
