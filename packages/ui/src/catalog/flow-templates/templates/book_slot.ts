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
          see: "Available times for {record.service}. All times are local.",
          do: "Choose a local time to review.",
          next: null,
          choices: [
            { label: "{record.slot}", step: "review" },
            { label: "{record.new_slot}", step: "review_alternate" },
          ],
          layout: {
            components: ["Note"],
          },
          states: ["empty", "waiting"],
          preview: {
            title: "Choose a time",
            messages: {
              empty: "No times are open for {record.service} on this date.",
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
            back: true,
            fields: ["service", "slot"],
            messages: {
              error: "This time is no longer available. Go back to choose another local time.",
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
            fields: ["reference", "service", "slot"],
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
            back: true,
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
            back: true,
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
        {
          id: "review_alternate",
          see: "Review {record.service} on {record.new_slot} before reserving it.",
          do: "Confirm this alternate booking.",
          layout: { components: ["KeyValue"] },
          states: ["waiting", "error"],
          preview: {
            title: "Review another time",
            action: "Confirm booking",
            fields: ["service", "new_slot"],
            back: true,
            messages: { error: "This time is no longer available. No booking was made." },
          },
        },
        {
          id: "alternate_booked",
          see: "{record.service} is booked for {record.new_slot}. Reference {record.reference}.",
          layout: { components: ["Success"] },
          states: ["success"],
          preview: { title: "Alternate time booked", fields: ["reference", "service", "new_slot"] },
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
