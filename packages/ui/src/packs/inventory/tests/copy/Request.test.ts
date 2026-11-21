import { describe, expect, it } from "vitest";
import { requestReading, requestStatusChoices } from "../../copy";

const repair = { priority: "urgent", status: "booked", who: "Ana", updates: [{}] } as const;

describe("Request copy", () => {
  it("reads the summary, available options and update field for the landlord", () => {
    expect(requestReading({ ...repair, may_change_status: true }, "filled", "en-GB")).toEqual([
      "Urgent",
      "Assigned to Ana",
      "Repair status",
      "Booked",
      "New",
      "Fixed",
      "Updates",
      "Write a brief update",
    ]);
    expect(requestStatusChoices(["new", "booked", "fixed"], "en-US")).toEqual([
      { value: "new", label: "New" },
      { value: "booked", label: "Booked" },
      { value: "fixed", label: "Fixed" },
    ]);
  });

  it("does not read alternate statuses for a tenant or missing content", () => {
    expect(requestReading({ ...repair, who: undefined, updates: [] }, "filled")).toEqual([
      "Urgent",
      "Repair status",
      "Booked",
      "Write a brief update",
    ]);
  });

  it("reads the completed state without the controls", () => {
    expect(requestReading(repair, "success", "en-US")).toEqual([
      "Urgent",
      "Assigned to Ana",
      "Repair status",
      "Fixed",
      "Updates",
    ]);
  });
});
