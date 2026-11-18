import { expect, it } from "vitest";
import { z } from "zod";
import { components, writerInput, scoreWrite } from "@lmthing/ui/catalog";

it("restores optional nulls and defaults recursively without changing the input", () => {
  const input = { style: null, rows: [{ title: "Fern", meta: null, trail: null, goto: null }] };
  const restored = writerInput(components.List, input);
  expect(restored).toEqual({ rows: [{ title: "Fern" }] });
  expect(components.List.props.safeParse(restored).success).toBe(true);
  expect(input.rows[0]?.meta).toBeNull();
  expect(scoreWrite(JSON.stringify({ c: "List", ...input }), components.List).pass).toBe(true);
});
it("does not hide invalid required nulls, unknown keys, empty strings or refinements", () => {
  for (const input of [
    { rows: null },
    { rows: [{ title: null }] },
    { rows: [{ title: "" }] },
    { rows: [{ title: "Fern", unknown: null }] },
    { style: "shelf", rows: [{ title: "Fern" }] },
  ])
    expect(components.List.props.safeParse(writerInput(components.List, input)).success).toBe(false);
  expect(scoreWrite('{"c":"rows","rows":[{"title":"Fern"}]}', components.List).pass).toBe(false);
});
it("preserves intentional nulls and array positions", () => {
  const def = {
    ...components.List,
    props: z.strictObject({
      value: z.string().nullable().optional(),
      rows: z.array(z.string().nullable()),
    }),
  };
  expect(writerInput(def, { value: null, rows: [null, "value"] })).toEqual({
    value: null,
    rows: [null, "value"],
  });
});
