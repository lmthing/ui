import { expect, it } from "vitest";
import { components, migrateLine, readComponent } from "@lmthing/ui/catalog";

it("accepts the planned Entries styles through the line migration without changing row links", () => {
  const entries = [
    { date: "2026-10-02", text: "A quiet morning.", tags: ["Morning"], photo: "lib:parks", goto: "morning" },
  ];
  const line = { c: "Entries", id: "e1", state: "filled", entries };
  expect(migrateLine({ ...line, style: "feed" })).toEqual(line);
  const migrated = migrateLine({ ...line, style: "compact", prompt: "Quiet moments" });
  const { id, c, state, ...input } = migrated;
  expect({ id, c, state }).toEqual({ id: "e1", c: "Entries", state: "filled" });
  expect(input).toEqual({ entries, media: "none", prompt: "Quiet moments" });
  expect(components.Entries.props.safeParse(input).success).toBe(true);
  expect(readComponent(components.Entries, input, "e1").join("\n")).toContain("[e1/r1 press→morning]");
  expect(migrateLine({ ...line, style: "compact", media: "thumb", density: "comfortable" })).toMatchObject({
    media: "thumb",
  });
});
