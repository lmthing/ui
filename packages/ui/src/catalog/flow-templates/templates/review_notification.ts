import type { FlowTemplate } from "../flow-template";
import { prompt } from "../../../entry/flow-review_notification.generated";

export const reviewNotification: FlowTemplate = {
  ...prompt,
  id: "review_notification",
  title: "Review notifications",
  nameSlots: [],
  recordShape: { subject: "string", update: "string", date: "string", reference: "string" },
  journeys: [
    {
      role: "member",
      id: "open_update",
      name: "Check what changed",
      goal: "Open the update about {record.subject} and return to the inbox without losing it.",
      steps: [
        {
          id: "unread",
          see: "New on {record.date}: {record.update}",
          do: "Open the affected record.",
          layout: { components: ["Note"] },
          states: ["empty", "error"],
          preview: {
            title: "Notifications",
            action: "{record.subject}",
            actionList: true,
            messages: {
              empty: "You're caught up. New updates will appear here.",
              error: "Can't refresh the inbox. Open the affected record when you're back online.",
            },
          },
        },
        {
          id: "detail",
          see: "{record.update}",
          do: "Return to the inbox after reading the update.",
          layout: { components: ["KeyValue"] },
          states: ["error"],
          preview: {
            title: "{record.subject}",
            action: "Return to inbox",
            fields: ["reference", "date"],
            messages: { error: "This record is no longer available. The dated update remains in the inbox." },
          },
        },
        {
          id: "read",
          see: "Read · {record.date}. {record.update}",
          do: "Reopen the affected record from the same inbox row.",
          layout: { components: ["Note"] },
          states: ["success"],
          preview: { title: "Notifications", action: "{record.subject}", actionList: true },
        },
        {
          id: "detail_read",
          see: "{record.update}",
          layout: { components: ["KeyValue"] },
          states: ["success"],
          preview: { title: "{record.subject}", fields: ["reference", "date"], back: true },
        },
      ],
    },
  ],
  examples: [
    {
      id: "rehearsal_room",
      names: {},
      record: {
        subject: "Brass rehearsal",
        update: "Moved to Room B. Bring your stand.",
        date: "Fri 27 Nov",
        reference: "REH-104",
      },
    },
    {
      id: "grain_delivery",
      names: {},
      record: {
        subject: "Rye delivery",
        update: "Pickup is at Bay 3, not the loading office.",
        date: "Sat 28 Nov",
        reference: "RYE-502",
      },
    },
  ],
  probes: {
    pick: [
      {
        request:
          "Show new updates in an in-app notification inbox. Let me open what changed and see it marked read when I return.",
        expect: "review_notification",
      },
      {
        request: "Let me choose weekly or daily reminder summaries in settings and save the setting.",
        expect: "change_preference",
      },
    ],
    fill: [
      {
        request: "For 'Brass rehearsal', REH-104, dated Fri 27 Nov: 'Moved to Room B. Bring your stand.'",
        expect: {
          names: {},
          record: { subject: "Brass rehearsal", date: "Fri 27 Nov", reference: "REH-104" },
        },
      },
    ],
  },
};
