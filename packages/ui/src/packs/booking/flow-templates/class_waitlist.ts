import type { FlowTemplate } from "../../../catalog/flow-templates";
import { prompt } from "../../../entry/flow-class_waitlist.generated";

const garden = {
  names: { member: "Nia" },
  record: {
    session: "Repotting workshop",
    starts: "Fri at 10:30 AM",
    respond_by: "Thu at 5:00 PM",
    reference: "CL-207",
  },
};

export const classWaitlist: FlowTemplate = {
  ...prompt,
  id: "class_waitlist",
  title: "Class booking with waitlist",
  nameSlots: ["member"],
  recordShape: { session: "string", starts: "string", respond_by: "string", reference: "string" },
  journeys: [
    {
      role: "member",
      id: "reserve_class",
      name: "Reserve a class",
      goal: "{name.member} books {record.session} or stays on its waitlist until offered a place.",
      steps: [
        {
          id: "schedule",
          see: "Find {record.session} on the schedule for {record.starts}. Book if open or join the waitlist if full.",
          do: "Choose the available path.",
          next: null,
          choices: [
            { label: "Book open spot", step: "review" },
            { label: "Join waitlist if full", step: "waiting" },
          ],
          layout: { components: ["KeyValue"] },
          states: ["empty", "waiting"],
          preview: {
            title: "Class schedule",
            fields: ["session", "starts"],
            messages: {
              empty: "No classes are listed for this day. Look on another date.",
              waiting: "Checking class availability.",
            },
          },
        },
        {
          id: "waiting",
          see: "You're on the waitlist for {record.session} at {record.starts}. You do not have a reservation.",
          do: "Open the offer once the studio has released a spot, or leave the waitlist.",
          next: null,
          choices: [
            { label: "See spot offer", step: "offer" },
            { label: "Leave waitlist", step: "leave" },
          ],
          layout: { components: ["KeyValue"] },
          states: ["waiting"],
          preview: {
            title: "On the waitlist",
            fields: ["session", "starts"],
            messages: { waiting: "No spot has opened yet. You are not booked." },
          },
        },
        {
          id: "offer",
          see: "A spot opened for {record.session} at {record.starts}. The spot is not booked yet.",
          do: "Tap Review spot.",
          next: "review",
          layout: { components: ["KeyValue", "Waitlist"] },
          states: ["error"],
          preview: {
            title: "Waitlist offer",
            action: "Review spot",
            fields: ["session", "starts"],
            messages: { error: "This offer expired. You have not been booked." },
          },
        },
        {
          id: "review",
          see: "Review {record.session} at {record.starts} before claiming the spot.",
          do: "Tap Confirm class.",
          next: "booked",
          layout: { components: ["KeyValue"] },
          states: ["waiting", "error"],
          preview: {
            title: "Review class",
            action: "Confirm class",
            fields: ["session", "starts"],
            messages: {
              waiting: "Holding while the class checks your spot. You are not booked yet.",
              error: "The spot is no longer available. No reservation was made.",
            },
          },
        },
        {
          id: "booked",
          see: "Booked: {record.session} at {record.starts}. Check-in reference: {record.reference}.",
          next: null,
          layout: { components: ["Success"] },
          states: ["success"],
          preview: { title: "Class booked", fields: ["session", "starts", "reference"] },
        },
        {
          id: "leave",
          see: "Leave the waitlist for {record.session}. This gives up your place in line.",
          do: "Tap Confirm leave.",
          next: "left",
          layout: { components: ["KeyValue"] },
          states: ["error"],
          preview: {
            title: "Leave the waitlist?",
            action: "Confirm leave",
            fields: ["session", "starts"],
            messages: { error: "You could not be removed. Your place in line is unchanged." },
          },
        },
        {
          id: "left",
          see: "You left the waitlist for {record.session}. There is no reservation.",
          layout: { components: ["Success"] },
          states: ["success"],
          preview: { title: "You left the waitlist", fields: ["session", "starts"] },
        },
      ],
    },
  ],
  examples: [
    { id: "garden", ...garden },
    {
      id: "leash",
      names: { member: "Sam" },
      record: {
        session: "Leash skills",
        starts: "Sat at 9:30 AM",
        respond_by: "Fri at noon",
        reference: "CL-418",
      },
    },
  ],
  probes: {
    pick: [
      {
        request: "Let my members reserve a group class or join its waiting list and claim a spot if offered.",
        expect: "class_waitlist",
      },
      {
        request: "Book an available one-on-one consultation and let the same guest move or cancel the time.",
        expect: "book_slot",
      },
    ],
    fill: [
      {
        request:
          "Nia wants Repotting workshop, Fri at 10:30 AM. The offer is good until Thu at 5:00 PM. Booking reference is CL-207.",
        expect: garden,
      },
    ],
  },
};
