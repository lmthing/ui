import { describe, expect, it } from "vitest";
import { documentDetails } from "../../copy";

describe("document copy", () => {
  const now = new Date(2026, 10, 21, 23);
  it.each([
    ["2026-11-20", "Expired"],
    ["2026-11-21", "Expires today"],
    ["2026-11-22", "Expires in 1 day"],
    ["2026-12-21", "Expires in 30 days"],
    ["2026-12-22", undefined],
  ])("computes the expiry warning for %s against the local calendar date", (expires, line) => {
    const details = documentDetails({ kind: "id", tags: [], expires }, now, "en");
    expect(details.find(({ part }) => part === "warning")?.line).toBe(line);
  });
  it("formats dates by locale and replaces references and identifiers", () => {
    const details = documentDetails(
      { kind: "id", tags: [], expires: "2027-01-25", file: "local:sensitive", number: "hidden" },
      now,
      "fr-FR",
    );
    expect(details).toContainEqual({ part: "file", line: "(private file)" });
    expect(details).toContainEqual({ part: "number", line: "Number ••••" });
    expect(details.find(({ part }) => part === "expires")?.line).toMatch(/25 janv\./);
  });
});
