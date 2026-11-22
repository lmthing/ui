import { describe, expect, it } from "vitest";
import { fieldStatus, formCopyRequest, formCount, formGates, formProgress, formReading } from "../../copy";

describe("FormFiller copy and validation", () => {
  it("distinguishes unset, invalid and complete values", () => {
    expect(fieldStatus({ kind: "text", value: " " })).toBe("missing");
    expect(fieldStatus({ kind: "date", value: "2026-02-29" })).toBe("invalid");
    expect(fieldStatus({ kind: "date", value: "2028-02-29" })).toBe("done");
    expect(fieldStatus({ kind: "number", value: "-0.25" })).toBe("done");
    expect(fieldStatus({ kind: "number", value: "NaN" })).toBe("invalid");
    expect(fieldStatus({ kind: "check", value: false })).toBe("missing");
  });

  it("does not count or describe optional hidden fields, but still exports valid values", () => {
    const initial = {
      detail: "brief",
      document: "local:original",
      fields: [{ id: "r1", label: "Optional", kind: "number", value: "31", required: false }],
    };
    const live = { ...initial, ...formGates(initial) };
    expect(formCount(formProgress(live.fields), "en")).toBe("0 of 0");
    expect(formReading(live, "filled", "en")).toEqual([
      "(private file)",
      "Fields completed",
      "0 of 0",
      "Preview original",
      "This form has no required fields",
      "Save copy",
      "Clear fields",
    ]);
    expect(formCopyRequest(live)).toMatchObject({ fields1: '[["Optional","number","31"]]' });
  });

  it("bounds the largest fully escaped payload before handing it to the local host", () => {
    const initial = {
      document: "local:original",
      fields: Array.from({ length: 16 }, (_, index) => ({
        id: `r${index + 1}`,
        label: "\u0000".repeat(28),
        value: "\u0000".repeat(80),
        required: true,
        kind: "text",
      })),
    };
    const request = formCopyRequest({ ...initial, ...formGates(initial) })!;
    const chunks = Object.entries(request)
      .filter(([key]) => key.startsWith("fields"))
      .map(([, json]) => json);
    expect(chunks).toHaveLength(4);
    expect(chunks.every((value) => value.length < 4096)).toBe(true);
    expect(chunks.flatMap((json) => JSON.parse(json))).toEqual(
      initial.fields.map(({ label, value, kind }) => [label, kind, value]),
    );
  });
});
