import { describe, expect, it } from "vitest";
import { activityLabel, activityReading, type ActivityEntry } from "../../copy";
import { dataWordsFor, registerDataWords } from "../../lang";

describe("ActivityLog copy", () => {
  const entry = { who: "Ana", text: "Changed the record.", time: "٠٩:١٠" };

  it("keeps authored audit content and timestamp untouched", () => {
    expect(activityLabel(entry)).toBe("Ana: Changed the record. (٠٩:١٠)");
  });

  it("uses the supplied language's phrasing", () => {
    const unregister = registerDataWords("fr", {
      ...dataWordsFor(),
      activityLabel: (who: string, text: string, time: string) => `${time} ${who} ${text}`,
    });
    try {
      expect(activityLabel(entry, "fr-CA")).toBe("٠٩:١٠ Ana Changed the record.");
    } finally {
      unregister();
    }
  });

  it("localizes the active filter and keeps category ids independent of language", () => {
    const english = dataWordsFor();
    const unregister = registerDataWords("fr", {
      ...english,
      activityKind: "Type de changement",
      activityKinds: { ...english.activityKinds, updated: "Modifié" },
    });
    const updated: ActivityEntry = {
      ...entry,
      id: "r1",
      photo: "lib:people",
      goto: "record",
      kind: "updated",
    };
    try {
      expect(activityReading({ entries: [updated], kind: "updated" }, "fr-CA")).toEqual([
        "Type de changement",
        "Modifié",
      ]);
    } finally {
      unregister();
    }
  });
});
