import type { FlowTemplate } from "../flow-template";
import { prompt } from "../../../entry/flow-transfer_acknowledge.generated";

export const transferAcknowledge: FlowTemplate = {
  ...prompt,
  id: "transfer_acknowledge",
  title: "Transfer and acknowledge",
  nameSlots: [],
  recordShape: {
    subject: "string",
    reference: "string",
    sender: "string",
    recipient: "string",
    deadline: "string",
    pending_note: "string",
    return_reason: "string",
  },
  journeys: [
    {
      role: "sender",
      id: "transfer_custody",
      name: "Send a transfer",
      goal: "{record.sender} can tell whether {record.recipient} took custody of {record.reference}.",
      steps: [
        {
          id: "review",
          see: "Hand {record.subject} to {record.recipient}. Receipt is due {record.deadline}.",
          do: "Send the transfer for the receiver to acknowledge.",
          layout: { components: ["KeyValue"] },
          states: ["error"],
          preview: {
            title: "Review transfer",
            fields: ["subject", "reference", "recipient", "deadline"],
            action: "Send transfer",
            messages: { error: "{record.reference} wasn't sent. Check the destination before trying again." },
          },
        },
        {
          id: "sent",
          see: "{record.pending_note}",
          do: "Open the receiver’s incoming transfers.",
          hands_off_to: { role: "receiver", step: "queue" },
          layout: { components: ["HandoffReceipt"] },
          states: ["waiting"],
          preview: { title: "Transfer sent", receipt: "waiting", action: "Open receiving queue" },
        },
        {
          id: "acknowledged",
          see: "{record.recipient} confirmed custody of {record.reference}. Keep this as your record.",
          next: null,
          layout: { components: ["HandoffReceipt"] },
          states: ["success"],
          preview: { title: "Transfer received", receipt: "received" },
        },
        {
          id: "returned",
          see: "{record.return_reason} Custody stays with {record.sender}.",
          next: null,
          layout: { components: ["HandoffReceipt"] },
          states: ["error"],
          preview: { title: "Transfer declined", receipt: "returned" },
        },
      ],
    },
    {
      role: "receiver",
      id: "confirm_custody",
      name: "Review incoming custody",
      goal: "{record.recipient} can open and settle {record.reference} from the receiving queue.",
      steps: [
        {
          id: "queue",
          see: "{record.subject} is in the incoming queue for {record.recipient}. {record.pending_note}",
          do: "Open the incoming transfer by reference.",
          layout: { components: ["Note"] },
          states: ["empty"],
          preview: {
            title: "Incoming transfers",
            action: "Open {record.reference}",
            actionList: true,
            messages: { empty: "No transfers are waiting for you." },
          },
        },
        {
          id: "review",
          see: "Check the item before taking custody. {record.pending_note}",
          do: "Accept only if you have the item, or decline and give the sender a reason.",
          next: null,
          choices: [
            { label: "Confirm receipt", step: "received" },
            { label: "Decline transfer", step: "decline" },
          ],
          layout: { components: ["HandoffReceipt"] },
          states: ["waiting"],
          preview: { title: "Review incoming transfer", receipt: "waiting", back: true },
        },
        {
          id: "received",
          see: "You've taken custody of {record.reference}. The sender can view this receipt.",
          do: "Open the sender’s record.",
          hands_off_to: { role: "sender", step: "acknowledged" },
          layout: { components: ["HandoffReceipt"] },
          states: ["success"],
          preview: { title: "Transfer received", receipt: "received", action: "Open sender's receipt" },
        },
        {
          id: "decline",
          see: "Tell {record.sender} why you cannot take custody of {record.reference}.",
          do: "Send the decline reason to the sender.",
          hands_off_to: { role: "sender", step: "returned" },
          layout: { components: ["Field"] },
          states: ["error"],
          preview: {
            title: "Decline transfer",
            action: "Send decline",
            fields: ["return_reason"],
            back: true,
            messages: { error: "Enter what the sender needs to fix." },
          },
        },
      ],
    },
  ],
  examples: [
    {
      id: "food_rescue",
      names: {},
      record: {
        subject: "12 crates of squash",
        reference: "FR-284",
        sender: "Market collection",
        recipient: "Pantry intake",
        deadline: "Fri by 4:30 pm",
        pending_note: "Receipt due Fri by 4:30 pm. Check the crate count at the intake door.",
        return_reason: "Recount: only 10 crates arrived.",
      },
    },
    {
      id: "overdue_shift_kit",
      names: {},
      record: {
        subject: "East gate radio kit",
        reference: "KIT-63",
        sender: "Day steward",
        recipient: "Night steward",
        deadline: "Sat by 7:00 pm",
        pending_note: "Overdue since Sat at 7:00 pm. The night steward hasn't confirmed the radios.",
        return_reason: "Radio 3 missing. Check its charger.",
      },
    },
  ],
  probes: {
    pick: [
      {
        request:
          "I need market collection to send a batch of produce to the pantry. The pantry should open it from incoming transfers, confirm it has the crates or decline, and show the sender the same receipt.",
        expect: "transfer_acknowledge",
      },
      {
        request:
          "I need a manager to approve a staff member's equipment request or decline it with a reason.",
        expect: "request_approve",
      },
    ],
    fill: [
      {
        request:
          "Send '12 crates of squash', FR-284, from Market collection to Pantry intake, due Fri by 4:30 pm. Pending: 'Receipt due Fri by 4:30 pm. Check the crate count at the intake door.' Decline: 'Recount: only 10 crates arrived.'",
        expect: {
          names: {},
          record: {
            subject: "12 crates of squash",
            reference: "FR-284",
            sender: "Market collection",
            recipient: "Pantry intake",
          },
        },
      },
    ],
  },
};
