import type { FlowTemplate } from "../flow-template";
import { prompt } from "../../../entry/flow-find_and_filter.generated";

export const findAndFilter: FlowTemplate = {
  ...prompt,
  id: "find_and_filter",
  title: "Find and filter",
  nameSlots: [],
  recordShape: {
    collection: "string",
    first: "string",
    first_group: "string",
    first_fact: "string",
    second: "string",
    second_group: "string",
    second_fact: "string",
    third: "string",
    third_group: "string",
    third_fact: "string",
  },
  journeys: [
    {
      role: "browser",
      id: "find_record",
      name: "Find a record",
      goal: "Find an entry in {record.collection} and return without losing your place.",
      steps: [
        {
          id: "results",
          see: "Search {record.collection} by name or narrow results by category.",
          do: "Type a query or pick a category, then open a result.",
          next: null,
          choices: [
            { label: "{record.first}", step: "first" },
            { label: "{record.second}", step: "second" },
            { label: "{record.third}", step: "third" },
          ],
          layout: { components: ["FilterBar", "List", "Empty"] },
          states: ["empty"],
          preview: {
            title: "{record.collection}",
            messages: { empty: "No matches. Try another term or clear." },
            search: {
              hint: "Search {record.collection}",
              filterLabel: "Category",
              results: [
                { title: "first", category: "first_group", detail: "first_fact", step: "first" },
                { title: "second", category: "second_group", detail: "second_fact", step: "second" },
                { title: "third", category: "third_group", detail: "third_fact", step: "third" },
              ],
            },
          },
        },
        {
          id: "first",
          see: "{record.first_fact}",
          next: null,
          layout: { components: ["KeyValue"] },
          states: ["success"],
          preview: { title: "{record.first}", fields: ["first_group"], back: true },
        },
        {
          id: "second",
          see: "{record.second_fact}",
          next: null,
          layout: { components: ["KeyValue"] },
          states: ["success"],
          preview: { title: "{record.second}", fields: ["second_group"], back: true },
        },
        {
          id: "third",
          see: "{record.third_fact}",
          next: null,
          layout: { components: ["KeyValue"] },
          states: ["success"],
          preview: { title: "{record.third}", fields: ["third_group"], back: true },
        },
      ],
    },
  ],
  examples: [
    {
      id: "weekend_performances",
      names: {},
      record: {
        collection: "Weekend performances",
        first: "The Winter Market",
        first_group: "Matinee",
        first_fact: "Sat 2 pm · Studio · 8 seats",
        second: "A Small Quiet City",
        second_group: "Evening",
        second_fact: "Sat 7:30 pm · Main · 12 seats",
        third: "Paper Moon",
        third_group: "Matinee",
        third_fact: "Sun 3 pm · Studio · 4 seats",
      },
    },
    {
      id: "repair_parts",
      names: {},
      record: {
        collection: "Repair parts",
        first: "Brake pads",
        first_group: "Brakes",
        first_fact: "BP-104 · Bin C4 · 6 pairs",
        second: "Chainring 42T",
        second_group: "Drivetrain",
        second_fact: "CR-042 · Bin A2 · 2 on hand",
        third: "Brake cable",
        third_group: "Brakes",
        third_fact: "BC-032 · Bin C7 · 12 on hand",
      },
    },
  ],
  probes: {
    pick: [
      {
        request:
          "Let me search the weekend performances, narrow them to matinees, open a match, then go back to the same search. If nothing matches, let me clear the search and filters.",
        expect: "find_and_filter",
      },
      {
        request:
          "Show me available times at the repair shop and let me reserve one, then show a booking reference.",
        expect: "book_slot",
      },
    ],
    fill: [
      {
        request:
          "Collection 'Repair parts': 'Brake pads' in 'Brakes', detail 'BP-104 · Bin C4 · 6 pairs'; 'Chainring 42T' in 'Drivetrain', detail 'CR-042 · Bin A2 · 2 on hand'; 'Brake cable' in 'Brakes', detail 'BC-032 · Bin C7 · 12 on hand'.",
        expect: {
          names: {},
          record: {
            collection: "Repair parts",
            first: "Brake pads",
            second_group: "Drivetrain",
            third: "Brake cable",
          },
        },
      },
    ],
  },
};
