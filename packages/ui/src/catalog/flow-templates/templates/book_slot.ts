import type { FlowTemplate } from "../flow-template";
import { prompt } from "../../../entry/flow-book_slot.generated";

export const bookSlot: FlowTemplate = {
  ...prompt,
  id: "book_slot",
  title: "Book a slot",
  nameSlots: ["guest"],
  recordShape: {
    service: "string",
    slot: "string",
    new_slot: "string",
    reference: "string",
  },
  journeys: [
    {
      role: "guest",
      id: "reserve_time",
      name: "Book a time",
      goal: "{name.guest} reserves a time for {record.service} and can manage {record.reference}.",
      steps: [
        {
          id: "availability",
          see: "Available times for {record.service}, including {record.slot}. Times are local.",
          do: "Tap Review booking",
          layout: {
            components: ["List"],
          },
          states: ["empty", "waiting"],
          preview: {
            title: "Choose a time",
            action: "Review booking",
            fields: ["slot", "new_slot"],
            messages: {
              waiting: "Checking which times are still available.",
            },
          },
        },
        {
          id: "review",
          see: "Review {record.service} on {record.slot} before reserving it.",
          do: "Tap Confirm booking",
          layout: {
            components: ["KeyValue"],
          },
          states: ["waiting", "error"],
          preview: {
            title: "Review booking",
            action: "Confirm booking",
            fields: ["service", "slot"],
            messages: {
              error: "This time is no longer available. Choose another time.",
            },
          },
        },
        {
          id: "confirmed",
          see: "{record.service} is booked for {record.slot}. Reference {record.reference}.",
          do: "Choose the next action.",
          next: null,
          choices: [
            {
              label: "Reschedule",
              step: "change_time",
            },
            {
              label: "Cancel booking",
              step: "review_cancel",
            },
          ],
          layout: {
            components: ["Success"],
          },
          states: ["success"],
          preview: {
            title: "Booking confirmed",
          },
        },
        {
          id: "change_time",
          see: "Move {record.reference} from {record.slot} to {record.new_slot}. Keep the old time until the change is confirmed.",
          do: "Tap Confirm change",
          layout: {
            components: ["KeyValue"],
          },
          states: ["waiting", "error"],
          preview: {
            title: "Choose a new time",
            action: "Confirm change",
            fields: ["slot", "new_slot"],
            messages: {
              error: "The new time is not available. Your original booking is still active.",
            },
          },
        },
        {
          id: "rescheduled",
          see: "{record.reference} now starts {record.new_slot}.",
          next: null,
          layout: {
            components: ["Success"],
          },
          states: ["success"],
          preview: {
            title: "Booking rescheduled",
            fields: ["reference", "new_slot"],
          },
        },
        {
          id: "review_cancel",
          see: "Cancel {record.service} on {record.slot}. This releases the reserved time.",
          do: "Tap Release time",
          layout: {
            components: ["KeyValue"],
          },
          states: ["waiting", "error"],
          preview: {
            title: "Review cancellation",
            action: "Release time",
            fields: ["reference", "slot"],
            messages: {
              error: "The cancellation was not sent. Your booking is unchanged.",
            },
          },
        },
        {
          id: "cancelled",
          see: "The time for {record.reference} has been released.",
          next: null,
          layout: {
            components: ["Success"],
          },
          states: ["success"],
          preview: {
            title: "Booking cancelled",
            fields: ["reference"],
          },
        },
      ],
    },
  ],
  examples: [
    {
      id: "consultation",
      names: {
        guest: "Mina",
      },
      record: {
        service: "Consultation",
        slot: "Tue at 10:00",
        new_slot: "Thu at 14:30",
        reference: "BK-204",
      },
    },
    {
      id: "fitting",
      names: {
        guest: "Noah",
      },
      record: {
        service: "Fitting",
        slot: "Mon at 15:00",
        new_slot: "Fri at 11:00",
        reference: "BK-351",
      },
    },
  ],
  probes: {
    pick: [
      {
        request: "Let clients choose an open appointment, get a confirmation, move it, or cancel it.",
        expect: "book_slot",
      },
      {
        request: "I already have a reservation. Let the front desk mark me as arrived.",
        expect: "check_in",
      },
    ],
    fill: [
      {
        request:
          "Mina wants a Consultation for Tue at 10:00. Use booking reference BK-204 and Thu at 14:30 as the alternate slot.",
        expect: {
          names: {
            guest: "Mina",
          },
          record: {
            service: "Consultation",
            slot: "Tue at 10:00",
            new_slot: "Thu at 14:30",
            reference: "BK-204",
          },
        },
      },
    ],
  },
};
