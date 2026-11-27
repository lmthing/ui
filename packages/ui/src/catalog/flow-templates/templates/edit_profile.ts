import type { FlowTemplate } from "../flow-template";
import { prompt } from "../../../entry/flow-edit_profile.generated";

const photo = {
  photo_action: "Keep current photo",
  keep_photo: "Keep current photo",
  retake_photo: "Use retaken sample",
  remove_photo: "Remove photo",
  current_photo: "lib:profile_original",
  replacement_photo: "lib:profile_retake",
};

export const editProfile: FlowTemplate = {
  ...prompt,
  id: "edit_profile",
  title: "View and edit a profile",
  nameSlots: [],
  recordShape: {
    display_name: "string",
    reference: "string",
    profile_context: "string",
    audience: "string",
    photo_action: "string",
    keep_photo: "string",
    retake_photo: "string",
    remove_photo: "string",
    current_photo: "string",
    replacement_photo: "string",
  },
  journeys: [
    {
      role: "owner",
      id: "update_identity",
      name: "Update your visible profile",
      goal: "Edit the profile for {record.reference} and see what {record.audience} can view.",
      steps: [
        {
          id: "current",
          see: "Visible to {record.audience}. Private account details aren't shown here.",
          do: "Edit the profile details.",
          layout: { components: ["Profile", "Note"] },
          states: ["empty"],
          preview: {
            title: "Your profile",
            action: "Edit profile",
            messages: { empty: "No profile is available for this membership." },
          },
        },
        {
          id: "edit",
          see: "{record.audience} can see these fields. Sign-in and contact details stay private.",
          do: "Continue to the profile photo or return without saving.",
          layout: { components: ["Field"] },
          states: ["error"],
          preview: {
            title: "Edit visible details",
            back: true,
            action: "Continue to photo",
            fields: ["display_name", "profile_context"],
            labels: { display_name: "Display name", profile_context: "Public description" },
            messages: {
              error: "Keep a display name and short description so people know whose profile this is.",
            },
          },
        },
        {
          id: "photo",
          see: "Keep or remove the photo, or preview a retaken sample. This demo doesn't open your camera.",
          do: "Choose a photo option and review before saving.",
          layout: { components: ["Profile", "Choice"] },
          states: ["error"],
          preview: {
            title: "Profile photo",
            back: true,
            action: "Review profile",
            choice: { field: "photo_action", options: ["keep_photo", "retake_photo", "remove_photo"] },
            messages: { error: "Camera access wasn't granted. The current profile photo is unchanged." },
          },
        },
        {
          id: "review",
          see: "This is what {record.audience} can see for {record.reference}.",
          do: "Save the profile as shown.",
          layout: { components: ["Profile", "Note"] },
          states: ["error", "waiting"],
          preview: {
            title: "Review visibility",
            action: "Save profile",
            back: true,
            messages: {
              error:
                "Profile wasn't saved. The published version has not changed. Keep your draft and retry.",
            },
          },
        },
        {
          id: "saved",
          see: "Updated profile for {record.reference}. Only the shown details are visible to {record.audience}.",
          layout: { components: ["Profile", "Note"] },
          states: ["success"],
          preview: { title: "Profile saved" },
        },
      ],
    },
  ],
  examples: [
    {
      id: "club_member",
      names: {},
      record: {
        ...photo,
        display_name: "Avery Chen",
        reference: "CLUB-184",
        profile_context: "Volunteer pace lead · 5 km group",
        audience: "running club members",
      },
    },
    {
      id: "studio_maker",
      names: {},
      record: {
        ...photo,
        display_name: "Noor Patel",
        reference: "MAKER-208",
        profile_context: "Woodshop · spindle turning",
        audience: "studio directory visitors",
      },
    },
  ],
  probes: {
    pick: [
      {
        request:
          "Let a club member edit their public display name and bio, preview who sees it, and save the profile.",
        expect: "edit_profile",
      },
      {
        request: "Let me change the units used in a workshop cut list in the app settings.",
        expect: "change_preference",
      },
    ],
    fill: [
      {
        request:
          "Avery Chen edits profile CLUB-184. 'Volunteer pace lead · 5 km group' is visible to 'running club members'. Default is 'Keep current photo'. The other options are 'Use retaken sample' and 'Remove photo'; use lib:profile_original and lib:profile_retake for the photos.",
        expect: {
          names: {},
          record: { display_name: "Avery Chen", reference: "CLUB-184", audience: "running club members" },
        },
      },
    ],
  },
};
