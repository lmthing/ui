import type { FlowTemplate } from "../flow-template";
import { prompt } from "../../../entry/flow-message_reply.generated";

const prior = { field: "previous", from: "them" } as const;

export const messageReply: FlowTemplate = {
  ...prompt,
  id: "message_reply",
  title: "Message and reply",
  nameSlots: ["sender", "recipient"],
  recordShape: {
    thread: "string",
    previous: "string",
    message: "string",
    reply: "string",
    first_send_fails: "boolean",
  },
  journeys: [
    {
      role: "sender",
      id: "send_message",
      name: "Send and read replies",
      goal: "{name.sender} can message {name.recipient} and read their reply in {record.thread}.",
      steps: [
        {
          id: "draft",
          see: "Open {record.thread} and draft a message for {name.recipient}.",
          do: "Send your draft.",
          layout: { components: ["Bubbles", "Composer"] },
          states: ["empty", "error"],
          preview: {
            title: "{record.thread}",
            labels: { message: "Message" },
            thread: { messages: [prior], compose: "message" },
            retry: "first_send_fails",
            messages: {
              empty: "This conversation is unavailable. Check that you still have access.",
              error: "Message not sent. Your draft is still here. Try again when you're connected.",
            },
          },
        },
        {
          id: "sent",
          see: "The message was sent; delivery hasn't been confirmed.",
          do: "Check the message's delivery status.",
          layout: { components: ["Bubbles"] },
          states: ["waiting"],
          preview: {
            title: "{record.thread}",
            action: "Check delivery",
            thread: { messages: [prior, { field: "message", from: "me", status: "sent" }] },
          },
        },
        {
          id: "delivered",
          see: "{name.recipient} received the message. It hasn't been marked read.",
          do: "Open the recipient's conversation.",
          hands_off_to: { role: "recipient", step: "incoming" },
          layout: { components: ["Bubbles"] },
          states: ["waiting"],
          preview: {
            title: "{record.thread}",
            action: "Open recipient's thread",
            thread: { messages: [prior, { field: "message", from: "me", status: "delivered" }] },
          },
        },
        {
          id: "reply_received",
          see: "{name.recipient} read the message and replied in {record.thread}.",
          next: null,
          layout: { components: ["Bubbles"] },
          states: ["success"],
          preview: {
            title: "{record.thread}",
            thread: {
              messages: [
                prior,
                { field: "message", from: "me", status: "read" },
                { field: "reply", from: "them" },
              ],
            },
          },
        },
      ],
    },
    {
      role: "recipient",
      id: "read_and_reply",
      name: "Read an incoming message",
      goal: "{name.recipient} can read and reply to {name.sender} in the same conversation.",
      steps: [
        {
          id: "incoming",
          see: "{name.sender}'s message arrived in {record.thread}.",
          do: "Write and send a reply.",
          hands_off_to: { role: "sender", step: "reply_received" },
          layout: { components: ["Bubbles", "Composer"] },
          states: ["error"],
          preview: {
            title: "{record.thread}",
            labels: { reply: "Reply" },
            thread: {
              messages: [
                { field: "previous", from: "me" },
                { field: "message", from: "them" },
              ],
              compose: "reply",
            },
            messages: {
              error: "Reply not sent. Your draft is still here. Check your connection and try again.",
            },
          },
        },
      ],
    },
  ],
  examples: [
    {
      id: "walk_pickup",
      names: { sender: "Sam", recipient: "Ana" },
      record: {
        thread: "Clover's pickup",
        previous: "Back gate or front steps for the 9:30 pickup?",
        message: "Back gate please. The lead is on the hook.",
        reply: "Got it. I'll latch the gate behind me.",
        first_send_fails: false,
      },
    },
    {
      id: "studio_load_in",
      names: { sender: "Jo", recipient: "Dev" },
      record: {
        thread: "Studio load-in",
        previous: "Can the piano dolly go through the stage entrance?",
        message: "Use Dock 2. The stage door only clears 80 cm.",
        reply: "Thanks. I'll meet the crew at Dock 2 at 7:15.",
        first_send_fails: true,
      },
    },
  ],
  probes: {
    pick: [
      {
        request:
          "Let me message our dog walker about the pickup gate, see when the note is delivered and read their reply in the same thread.",
        expect: "message_reply",
      },
      {
        request: "Let me send an invite to a shared schedule and see when the other person has joined.",
        expect: "invite_accept",
      },
    ],
    fill: [
      {
        request:
          "Sam and Ana use 'Clover’s pickup'. Ana asked 'Back gate or front steps?' Sam sends 'Back gate please.' Ana replies 'I will latch it.'",
        expect: {
          names: { sender: "Sam", recipient: "Ana" },
          record: { message: "Back gate please.", reply: "I will latch it." },
        },
      },
    ],
  },
};
