import type { FlowTemplate } from "../flow-template";
import { prompt } from "../../../entry/flow-signup_onboard.generated";

export const signupOnboard: FlowTemplate = {
  ...prompt,
  id: "signup_onboard",
  title: "Sign up and get started",
  nameSlots: ["member"],
  recordShape: {
    goal: "string",
    task: "string",
    account: "string",
  },
  journeys: [
    {
      role: "member",
      id: "first_value",
      name: "Get started",
      goal: "{name.member} can complete the first task: {record.task}.",
      steps: [
        {
          id: "account",
          see: "Enter an email so you can verify the account and get back to it later.",
          do: "Tap Create account",
          layout: {
            components: ["Note", "Field"],
          },
          states: ["empty", "error"],
          preview: {
            title: "Create your account",
            action: "Create account",
            fields: ["account"],
            messages: {
              error: "Check the email address before continuing.",
            },
          },
        },
        {
          id: "verify",
          see: "A verification message was sent to {record.account}.",
          do: "Tap Continue after verifying",
          layout: {
            components: ["Note"],
          },
          states: ["waiting", "error"],
          preview: {
            title: "Verify your email",
            action: "Continue after verifying",
            messages: {
              error: "The link has expired. Ask for a fresh verification message.",
            },
          },
        },
        {
          id: "preferences",
          see: "Choose what you want to do first, or skip this setup.",
          do: "Tap Save goal",
          optional: true,
          layout: {
            components: ["KeyValue"],
          },
          states: ["empty"],
          preview: {
            title: "Choose a goal",
            action: "Save goal",
            fields: ["goal"],
          },
        },
        {
          id: "first_task",
          see: "You’re ready to start. Try this first: {record.task}.",
          do: "Tap {record.task}",
          layout: {
            components: ["Note"],
          },
          states: ["waiting"],
          preview: {
            title: "Try a first task",
            action: "{record.task}",
          },
        },
        {
          id: "ready",
          see: "{name.member}, you finished the first task and can keep going on your own.",
          next: null,
          layout: {
            components: ["Success"],
          },
          states: ["success"],
          preview: {
            title: "You’re ready to go",
            fields: ["goal", "task"],
          },
        },
      ],
    },
  ],
  examples: [
    {
      id: "organize",
      names: {
        member: "Tess",
      },
      record: {
        goal: "Organize notes",
        task: "Make a first list",
        account: "tess@example.test",
      },
    },
    {
      id: "plan",
      names: {
        member: "Vic",
      },
      record: {
        goal: "Plan a project",
        task: "Add a first milestone",
        account: "vic@example.test",
      },
    },
  ],
  probes: {
    pick: [
      {
        request: "Let a new person create an account and walk them to their first useful action.",
        expect: "signup_onboard",
      },
      {
        request: "Let an existing workspace member invite someone who then accepts their access.",
        expect: "invite_accept",
      },
    ],
    fill: [
      {
        request:
          "My name is Tess and my sign-up email is tess@example.test. My goal is 'Organize notes', and my first task is 'Make a first list'.",
        expect: {
          names: {
            member: "Tess",
          },
          record: {
            goal: "Organize notes",
            task: "Make a first list",
            account: "tess@example.test",
          },
        },
      },
    ],
  },
};
