import { expect, it } from "vitest";
import { readFields } from "./fields";
import { partMeta } from "./parts";

it("does not mistake a named item part that is also a verb for a component action", () => {
  const fields = readFields("`rows` of `label` text(20), 1–6", {}, {});
  const { meta } = partMeta("rows `copy press`, `rows select`", fields);
  expect(meta).toEqual({
    parts: ["root", "rows"],
    items: { key: "rows", parts: ["root", "copy"] },
    actions: { parts: { rows: ["select"] }, items: { copy: ["press"] } },
  });
});
