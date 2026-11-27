import type { FlowTemplate } from "../flow-template";
import { prompt } from "../../../entry/flow-check_in.generated";

export const checkIn: FlowTemplate = {
  ...prompt,
  id: "check_in",
  title: "Check in and attend",
  nameSlots: ["attendee", "host"],
  recordShape: {
    event: "string",
    reference: "string",
    arrival: "string",
  },
  journeys: [
    {
      role: "attendee",
      id: "show_pass",
      name: "Arrive for an event",
      goal: "{name.attendee} presents a pass and sees that attendance was recorded.",
      steps: [
        {
          id: "pass",
          see: "Show {name.host} your pass for {record.event}. This does not record arrival.",
          do: "Tap Show pass",
          hands_off_to: {
            role: "host",
            step: "find",
          },
          layout: {
            components: ["KeyValue"],
          },
          states: ["waiting", "error"],
          preview: {
            title: "Your check-in pass",
            action: "Show pass",
            fields: ["event", "reference"],
            messages: {
              error: "The pass could not be opened. Ask the host to find your reservation.",
            },
          },
        },
        {
          id: "arrived",
          see: "{name.attendee} checked in to {record.event} at {record.arrival}.",
          next: null,
          layout: {
            components: ["Success"],
          },
          states: ["success"],
          preview: {
            title: "You’re checked in",
            fields: ["reference", "event", "arrival"],
          },
        },
      ],
    },
    {
      role: "host",
      id: "mark_arrival",
      name: "Record attendance",
      goal: "{name.host} matches the pass and marks the attendee present once.",
      steps: [
        {
          id: "find",
          see: "Match {record.reference} to {name.attendee} for {record.event}; search by name if the pass cannot be read.",
          do: "Tap Review arrival",
          layout: {
            components: ["List"],
          },
          states: ["empty", "error"],
          preview: {
            title: "Find reservation",
            action: "Review arrival",
            fields: ["reference", "event"],
            messages: {
              error: "No reservation matched. Check the event, pass or attendee name.",
            },
          },
        },
        {
          id: "record",
          see: "Confirm {name.attendee}'s arrival for reservation {record.reference}.",
          do: "Tap Mark present",
          hands_off_to: {
            role: "attendee",
            step: "arrived",
          },
          layout: {
            components: ["KeyValue"],
          },
          states: ["waiting", "error"],
          preview: {
            title: "Review arrival",
            action: "Mark present",
            fields: ["reference", "event", "arrival"],
            back: true,
            messages: {
              error: "Attendance is already recorded. No second arrival was added.",
            },
          },
        },
      ],
    },
  ],
  examples: [
    {
      id: "practice",
      names: {
        attendee: "Rae",
        host: "Dani",
      },
      record: {
        event: "Morning practice",
        reference: "CK-721",
        arrival: "08:55",
      },
    },
    {
      id: "workshop",
      names: {
        attendee: "Jules",
        host: "Pat",
      },
      record: {
        event: "Print workshop",
        reference: "CK-926",
        arrival: "14:05",
      },
    },
  ],
  probes: {
    pick: [
      {
        request: "Let someone show an existing event pass at the door so staff can mark that person present.",
        expect: "check_in",
      },
      {
        request: "Let visitors pick an open class time and reserve it.",
        expect: "book_slot",
      },
    ],
    fill: [
      {
        request: "Rae arrives for Morning practice at 08:55. Dani checks her in using pass reference CK-721.",
        expect: {
          names: {
            attendee: "Rae",
            host: "Dani",
          },
          record: {
            event: "Morning practice",
            reference: "CK-721",
            arrival: "08:55",
          },
        },
      },
    ],
  },
};
