import type { FlowTemplate } from "../flow-template";
import { prompt } from "../../../entry/flow-invite_accept.generated";

export const inviteAccept: FlowTemplate = {
  ...prompt,
  id: "invite_accept",
  title: "Invite and accept",
  nameSlots: ["inviter", "invitee"],
  recordShape: {
    space: "string",
    access: "string",
    reference: "string",
  },
  journeys: [
    {
      role: "inviter",
      id: "share_access",
      name: "Invite someone",
      goal: "{name.inviter} can invite {name.invitee} and see when they join.",
      steps: [
        {
          id: "address",
          see: "Review the invitation to {name.invitee} for {record.space}, with {record.access} access.",
          do: "Tap Send invitation",
          layout: {
            components: ["KeyValue"],
          },
          states: ["empty", "error"],
          preview: {
            title: "New invitation",
            action: "Send invitation",
            fields: ["space", "access"],
            messages: {
              error: "The invitation could not be sent. Check the recipient and try again.",
            },
          },
        },
        {
          id: "pending",
          see: "{name.invitee} has not accepted invitation {record.reference} yet.",
          do: "Tap Open invitation",
          hands_off_to: {
            role: "invitee",
            step: "review",
          },
          layout: {
            components: ["Note"],
          },
          states: ["waiting"],
          preview: {
            title: "Invitation pending",
            action: "Open invitation",
          },
        },
        {
          id: "joined",
          see: "{name.invitee} accepted {record.reference} and joined {record.space}.",
          next: null,
          layout: {
            components: ["Success"],
          },
          states: ["success"],
          preview: {
            title: "Member joined",
            fields: ["reference", "access"],
          },
        },
      ],
    },
    {
      role: "invitee",
      id: "join_space",
      name: "Accept invitation",
      goal: "{name.invitee} knows where joining leads before accepting.",
      steps: [
        {
          id: "review",
          see: "{name.inviter} invited you to {record.space}. You will join as {record.access}.",
          do: "Tap Accept invitation",
          layout: {
            components: ["KeyValue"],
          },
          states: ["waiting", "error"],
          preview: {
            title: "Review invitation",
            action: "Accept invitation",
            fields: ["space", "access"],
            messages: {
              error: "This invitation has expired. Ask the sender for a new one.",
            },
          },
        },
        {
          id: "welcome",
          see: "You now have {record.access} access to {record.space}.",
          do: "Tap Show joined status",
          hands_off_to: {
            role: "inviter",
            step: "joined",
          },
          layout: {
            components: ["Success"],
          },
          states: ["success"],
          preview: {
            title: "You joined",
            fields: ["space", "access"],
            action: "Show joined status",
          },
        },
      ],
    },
  ],
  examples: [
    {
      id: "reading_circle",
      names: {
        inviter: "Jo",
        invitee: "Lee",
      },
      record: {
        space: "Reading circle",
        access: "Member",
        reference: "IN-321",
      },
    },
    {
      id: "planning_group",
      names: {
        inviter: "Aya",
        invitee: "Kim",
      },
      record: {
        space: "Planning group",
        access: "Viewer",
        reference: "IN-515",
      },
    },
  ],
  probes: {
    pick: [
      {
        request:
          "Let an organizer invite a colleague to join a shared space as a viewer, then show when they accept.",
        expect: "invite_accept",
      },
      {
        request: "Let new users create their own account and choose a first task.",
        expect: "signup_onboard",
      },
    ],
    fill: [
      {
        request: "Jo invites Lee to the Reading circle with Member access. Use invitation reference IN-321.",
        expect: {
          names: {
            inviter: "Jo",
            invitee: "Lee",
          },
          record: {
            space: "Reading circle",
            access: "Member",
            reference: "IN-321",
          },
        },
      },
    ],
  },
};
