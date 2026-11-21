import { expect, it } from "vitest";
import { z } from "zod";
import { secret } from "../../props";
import type { ReadSchema } from "./index";
import { redactSecretProps } from "./secret-props";

it("redacts present secret strings recursively without mutating input or adding absent keys", () => {
  const schema = z.strictObject({
    code: secret(32).optional(),
    records: z.array(
      z.strictObject({
        title: z.string(),
        code: secret(32).nullable(),
        optional: secret(32).optional(),
      }),
    ),
  });
  const json = z.toJSONSchema(schema, { io: "input" }) as ReadSchema;
  const input = {
    records: [
      { title: "Visible", code: "fixture" },
      { title: "No code", code: null },
      { title: "Blank code", code: "" },
    ],
  };
  const safe = redactSecretProps(json, input);
  expect(safe).toEqual({ records: [{ title: "Visible", code: "(secret)" }, ...input.records.slice(1)] });
  expect((safe.records as unknown[])[1]).toBe(input.records[1]);
  expect(input.records[0]!.code).toBe("fixture");
  expect(redactSecretProps(json, safe)).toBe(safe);
});
