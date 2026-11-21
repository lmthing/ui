import { expect, it } from "vitest";
import { z } from "zod";
import { components, readComponent, type Definition } from "@lmthing/ui/catalog";
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

const customReader = {
  ...components.Header.meta,
  id: "ReadFixture",
  read: (input: unknown) => [JSON.stringify(input)],
};

it("protects custom readings for discriminated unions and intersections without masking public branches", () => {
  const def = {
    ...components.Header,
    meta: customReader,
    props: z.strictObject({
      record: z.discriminatedUnion("kind", [
        z.strictObject({ kind: z.literal("private"), code: secret(32) }),
        z.strictObject({ kind: z.literal("public"), code: z.string() }),
      ]),
      pair: z.intersection(z.object({ code: secret(32) }), z.object({ title: z.string() })),
    }),
  } satisfies Definition;
  const pair = { code: "synthetic-intersection", title: "Visible" };
  const read = (record: unknown) => readComponent(def, { record, pair }, "f1").join("\n");
  const hidden = read({ kind: "private", code: "synthetic-union" });
  expect(hidden).not.toMatch(/synthetic-union|synthetic-intersection/);
  expect(hidden.match(/"\(secret\)"/g)).toHaveLength(2);
  expect(read({ kind: "public", code: "public-label" })).toContain("public-label");
});

it("protects both copies of the active session row seen by custom readings", () => {
  const def = {
    ...components.Header,
    meta: {
      ...customReader,
      session: { kind: "rounds", items: "rounds", hidden: [], reveal: "answer", next: "next" },
    },
    props: z.strictObject({ rounds: z.array(z.strictObject({ code: secret(32) })) }),
  } satisfies Definition;
  const lines = readComponent(def, { rounds: [{ code: "synthetic-active-round" }] }, "f1").join("\n");
  expect(lines).not.toContain("synthetic-active-round");
  expect(lines).toContain('"rounds":[{"code":"(secret)"');
  expect(lines).toMatch(/"\$session":\{[^]*?"item":\{"code":"\(secret\)"/);
});
