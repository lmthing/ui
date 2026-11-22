import type { LDMLPluralRule } from "../../../../catalog";

export const words = {
  inspections: {
    kind: { move_in: "Move-in", move_out: "Move-out", periodic: "Periodic" },
    condition: {
      unrecorded: "Unrecorded",
      good: "Good",
      worn: "Worn",
      damaged: "Damaged",
      not_applicable: "Not applicable",
    },
    rooms: "Rooms",
    conditionFor: (title: string) => `Condition of ${title}`,
    note: "Add a note",
    noteFor: (title: string) => `Note for ${title}`,
    addPhoto: "Add photo",
    removePhoto: "Remove last photo",
    photoFor: (title: string, index: string) => `${title} photo ${index}`,
    finalise: "Finalise report",
    finalised: "Report finalised",
    signedOff: (date: string) => `Signed off ${date}`,
    dateTime: (date: string, time: string) => `${date} at ${time}`,
    completion: (recorded: string, total: string, form: LDMLPluralRule) =>
      `${recorded} of ${total} ${form === "one" ? "check" : "checks"} recorded`,
    previous: "Previous report referenced",
    coSign: "Co-sign check",
    coSigned: "Tenant co-signed",
    coSignPending: "Tenant co-sign pending",
    dispute: "Tenant dispute",
    disputeHint: "Describe what you disagree with",
    disputeReading: (comment: string) => `Tenant dispute: ${comment}`,
    error: "Couldn’t update the report",
    errorDetail: "Review conditions and photos.",
  },
};
