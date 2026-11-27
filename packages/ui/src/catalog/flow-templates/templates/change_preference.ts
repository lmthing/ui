import type { FlowTemplate } from "../flow-template";
import { prompt } from "../../../entry/flow-change_preference.generated";

export const changePreference: FlowTemplate = {
  ...prompt,
  id: "change_preference",
  title: "Change a preference",
  nameSlots: [],
  recordShape: {
    setting: "string",
    old_value: "string",
    new_value: "string",
    scope: "string",
    first_save_fails: "boolean",
  },
  journeys: [
    {
      role: "member",
      id: "change_setting",
      name: "Update a preference",
      goal: "Change {record.setting} for {record.scope} and see which value is in effect.",
      steps: [
        {
          id: "current",
          see: "{record.setting} controls {record.scope}.",
          do: "Edit the preference.",
          layout: { components: ["KeyValue"] },
          states: ["waiting"],
          preview: {
            title: "Settings",
            action: "Edit preference",
            fields: ["old_value"],
            labels: { old_value: "Current value" },
          },
        },
        {
          id: "edit",
          see: "Choose what to use for {record.scope}. The old value stays active until you save.",
          do: "Save the selected value or go back without saving.",
          layout: { components: ["Choice"] },
          states: ["error"],
          preview: {
            title: "{record.setting}",
            action: "Save preference",
            back: true,
            retry: "first_save_fails",
            choice: { field: "new_value", options: ["old_value", "new_value"] },
            messages: {
              error:
                "The setting wasn't saved. {record.old_value} is still active. Try again when connected.",
            },
          },
        },
        {
          id: "saved",
          see: "{record.setting} now uses {record.new_value}.",
          do: "Reopen the setting or undo the change.",
          next: null,
          choices: [
            { label: "Reopen preference", step: "reopened" },
            { label: "Undo change", step: "undone" },
          ],
          layout: { components: ["KeyValue"] },
          states: ["success"],
          preview: {
            title: "Preference saved",
            fields: ["new_value"],
            labels: { new_value: "Active value" },
          },
        },
        {
          id: "reopened",
          see: "This is the saved value for {record.scope}.",
          next: null,
          layout: { components: ["KeyValue"] },
          states: ["success"],
          preview: {
            title: "{record.setting}",
            fields: ["new_value"],
            labels: { new_value: "Current value" },
          },
        },
        {
          id: "undone",
          see: "The original preference is active again for {record.scope}.",
          layout: { components: ["KeyValue"] },
          states: ["success"],
          preview: {
            title: "Preference restored",
            fields: ["old_value"],
            labels: { old_value: "Current value" },
          },
        },
      ],
    },
  ],
  examples: [
    {
      id: "market_digest",
      names: {},
      record: {
        setting: "Market digest",
        old_value: "Every Friday",
        new_value: "Every morning",
        scope: "the stall availability email",
        first_save_fails: false,
      },
    },
    {
      id: "workshop_units",
      names: {},
      record: {
        setting: "Workshop measurements",
        old_value: "Inches",
        new_value: "Millimetres",
        scope: "cut lists and part drawings",
        first_save_fails: true,
      },
    },
  ],
  probes: {
    pick: [
      {
        request:
          "Let me change the workshop measurement units in settings, save them and reopen to confirm which units are active. Let me undo it.",
        expect: "change_preference",
      },
      {
        request: "Let me create an account, verify my email and start my first project.",
        expect: "signup_onboard",
      },
    ],
    fill: [
      {
        request:
          "The setting 'Workshop measurements' controls 'cut lists and part drawings'. Change from Inches to Millimetres.",
        expect: {
          names: {},
          record: { setting: "Workshop measurements", old_value: "Inches", new_value: "Millimetres" },
        },
      },
    ],
  },
};
