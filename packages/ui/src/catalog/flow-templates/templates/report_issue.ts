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
    evidence: "string",
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
          see: "Add a location or name the evidence that helps {name.resolver} find the issue.",
          do: "Review the evidence with the report.",
          optional: true,
          layout: {
            components: ["Field"],
          },
          states: ["empty"],
          preview: {
            title: "Add context",
            action: "Review report",
            fields: ["evidence"],
            back: true,
          },
        },
        {
          id: "submit",
          see: "{record.issue} will be filed under {record.reference} for {name.resolver}.",
          do: "Tap Send report",
          layout: {
            components: ["KeyValue"],
          },
          states: ["waiting"],
          preview: {
            title: "Review report",
            action: "Send report",
            fields: ["issue", "reference", "evidence"],
            back: true,
          },
        },
        {
          id: "reported",
          see: "{name.resolver} received report {record.reference}. It hasn't been resolved yet.",
          do: "Open the resolver’s copy of the report.",
          hands_off_to: { role: "resolver", step: "triage" },
          layout: { components: ["KeyValue"] },
          states: ["waiting"],
          preview: {
            title: "Issue reported",
            action: "Open resolver's report",
            fields: ["reference", "issue", "evidence"],
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
            fields: ["issue", "reference", "evidence"],
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
            back: true,
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
        evidence: "Cabinet 3 · lower hinge",
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
        evidence: "Hall B · second-floor landing",
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
          "Uma reports a Loose cabinet hinge to Eli under IS-480 at 'Cabinet 3 · lower hinge'. The final resolution is Hinge tightened.",
        expect: {
          names: {
            reporter: "Uma",
            resolver: "Eli",
          },
          record: {
            issue: "Loose cabinet hinge",
            reference: "IS-480",
            resolution: "Hinge tightened",
            evidence: "Cabinet 3 · lower hinge",
          },
        },
      },
    ],
  },
};
