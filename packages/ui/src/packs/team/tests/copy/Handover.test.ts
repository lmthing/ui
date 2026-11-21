import { describe, expect, it } from "vitest";
import { handoverDetails, handoverReading } from "../../copy";
import { teamWordsFor } from "../../lang";

describe("handover copy", () => {
  const notes = [
    { id: "r1", time: "08:40", flag: "Watch the step", seen: false },
    { id: "r2", time: "07:15", seen: true },
  ];

  it("projects only the timestamp out of each brief note without changing the source", () => {
    expect(handoverDetails({ detail: "full", notes })).toBeUndefined();
    expect(handoverDetails({ detail: "brief", notes })).toEqual({
      notes: notes.map((note) => ({ ...note, time: undefined })),
    });
    expect(notes.map(({ time }) => time)).toEqual(["08:40", "07:15"]);
  });

  it("reads the seen status in row order with stable addresses and word fallback", () => {
    const { seen, unseen } = teamWordsFor().handover;
    expect(handoverReading({ notes })).toEqual([`r1 ${unseen}`, `r2 ${seen}`]);
    expect(handoverReading({ notes }, "ar")).toEqual([`r1 ${unseen}`, `r2 ${seen}`]);
  });
});
