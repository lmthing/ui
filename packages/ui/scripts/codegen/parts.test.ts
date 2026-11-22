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

it("keeps named item actions and their confirmation distinct from the array root actions", () => {
  const fields = readFields("`rows` of `label` text(20), 1–6; `entries` of `title` text(24), 1–6", {}, {});
  const { meta } = partMeta("items `root press`, items `remove press` (confirmParts)", fields);
  expect(meta.items?.parts).toEqual(["root", "rows", "entries", "remove"]);
  expect(meta.actions?.items).toEqual({ rows: ["press"], entries: ["press"], remove: ["press"] });
  expect(meta.confirmParts).toEqual(["remove"]);
});
