import { describe, expect, it } from "vitest";
import type { Meta } from "../meta";
import { projectSelection, selectionAt, selectionChanges, selectionError } from "./selection";
import { nestedAt, nestedControls, projectNested } from "./selection";
import { validateActionValue } from "./validate-value";

const meta: Meta = {
  id: "Fixture",
  group: "input",
  purpose: "Select",
  pick: "Select",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Local",
  items: { key: "rows", parts: ["root"] },
  actions: { items: { root: ["select"] } },
  select: { prop: "at", value: "index" },
};
const props = {
  rows: [
    { time: "09:00", label: "First" },
    { time: "10:00", label: "Second" },
  ],
};

describe("declared selection", () => {
  it("resolves indexes, positions, fields and named parts", () => {
    expect(selectionAt(meta, props, "r2")).toMatchObject({ value: 1 });
    const position = { ...meta, select: { prop: "at", value: "position", parts: { anyone: 0 } } } as Meta;
    expect(selectionAt(position, props, "r1/root")).toMatchObject({ value: 1 });
    expect(selectionAt(position, props, "anyone")).toEqual({ value: 0 });
    const field = { ...meta, select: { prop: "at", value: { field: "time" } } };
    expect(selectionAt(field, props, "r2")).toMatchObject({ value: "10:00" });
    expect(selectionAt(meta, props, "r3")).toBeUndefined();
    const { select: _select, ...withoutSelection } = meta;
    expect(selectionAt(withoutSelection, props, "r1")).toBeUndefined();
  });
  it("accepts only the addressed value or a compatible legacy label/index", () => {
    expect(selectionError(meta, props, "r2", "Second")).toBeUndefined();
    expect(selectionError(meta, props, "r2", 0)).toBe("Select the option at this address");
    const position = { ...meta, select: { prop: "at", value: "position", parts: { anyone: 0 } } } as Meta;
    expect(selectionError(position, props, "r1", 0)).toBe("Select the option at this address");
    expect(selectionError(position, props, "anyone", 1)).toBe("Select the option at this address");
    const field = { ...meta, select: { prop: "at", value: { field: "time" } } };
    expect(selectionError(field, props, "r2", "09:00")).toBe("Select the option at this address");
    expect(selectionError(field, props, "r2", 1)).toBeUndefined();
    expect(selectionError(meta, props, "r3", 2)).toBe("No option at this address");
  });
  it("clears stale action values and projects only the latest single selection", () => {
    let values = selectionChanges(meta, props, "r1");
    values = { ...values, ...selectionChanges(meta, props, "r2") };
    expect(values.r1).toBeUndefined();
    expect(values.r2).toBe(1);
    expect(projectSelection(meta, props, (part) => values[part]).at).toBe(1);
    values = { ...values, ...selectionChanges(meta, props, "r1") };
    expect(projectSelection(meta, props, (part) => values[part]).at).toBe(0);
  });
  it("projects flags on the declared row field and honors stamped prefixes", () => {
    const flags = {
      ...meta,
      items: { ...meta.items!, prefix: "o" },
      select: { prop: "chosen", value: "index", mode: "flags" },
    } as Meta;
    const values = selectionChanges(flags, props, "o2");
    expect(values).toEqual({ o1: false, o2: true });
    expect(projectSelection(flags, props, (part) => values[part]).rows).toEqual([
      { ...props.rows[0], chosen: false },
      { ...props.rows[1], chosen: true },
    ]);
  });
});

const nestedMeta: Meta = {
  ...meta,
  items: {
    key: "rows",
    parts: ["root"],
    nested: {
      key: "children",
      parts: {
        active: { action: "toggle", prop: "on" },
        amount: { action: "set", prop: "value", min: 0, max: 5, integer: true, when: "active" },
      },
    },
  },
};
const nestedProps = {
  rows: [
    {
      children: [
        { on: false, value: 0 },
        { on: true, value: 2 },
      ],
    },
    { children: [{ on: true, value: 5 }] },
  ],
};

describe("nested declarations", () => {
  it("enumerates actual sub-items and resolves exact one-based addresses", () => {
    expect(nestedControls(nestedMeta, nestedProps).map(({ target }) => target)).toEqual([
      "r1/active_1",
      "r1/amount_1",
      "r1/active_2",
      "r1/amount_2",
      "r2/active_1",
      "r2/amount_1",
    ]);
    expect(nestedAt(nestedMeta, nestedProps, "r1/amount_1")?.enabled).toBe(false);
    expect(nestedAt(nestedMeta, nestedProps, "r1/amount_2")?.enabled).toBe(true);
    for (const target of ["r1/amount_0", "r1/amount_01", "r1/amount_3", "r3/active_1", "r1/unknown_1"])
      expect(nestedAt(nestedMeta, nestedProps, target)).toBeUndefined();
  });
  it("honors row ids and prefixes and leaves undeclared or absent arrays alone", () => {
    expect(
      nestedAt(nestedMeta, { rows: [{ id: "o9", children: [{ on: true }] }] }, "o9/active_1"),
    ).toBeDefined();
    expect(
      nestedAt({ ...nestedMeta, items: { ...nestedMeta.items!, prefix: "o" } }, nestedProps, "o2/active_1"),
    ).toBeDefined();
    expect(nestedControls(nestedMeta, { rows: [{}, { children: [] }] })).toEqual([]);
    expect(nestedControls(nestedMeta, {})).toEqual([]);
    expect(projectNested(meta, props, () => true)).toBe(props);
  });
  it("projects false and zero without mutating seeds or other controls", () => {
    const values = { "r1/active_2": false, "r1/amount_2": 0 };
    const projected = projectNested(nestedMeta, nestedProps, (part) => values[part as keyof typeof values]);
    expect(projected.rows).toEqual([
      {
        children: [
          { on: false, value: 0 },
          { on: false, value: 0 },
        ],
      },
      nestedProps.rows[1],
    ]);
    expect(nestedProps.rows[0]!.children[1]).toEqual({ on: true, value: 2 });
    expect(projectNested(nestedMeta, { rows: [{}] }, () => true)).toEqual({ rows: [{}] });
  });
  it("uses shared finite numeric, integer and inclusive bound validation", () => {
    const limits = nestedMeta.items!.nested!.parts.amount!;
    for (const value of [0, 5]) expect(validateActionValue("set", value, limits)).toBeNull();
    for (const value of [-1, 6, 0.5, "2", NaN, Infinity, undefined])
      expect(validateActionValue("set", value, limits)?.code).toBe("invalid_value");
    expect(validateActionValue("set", 0.5, { min: 0 })).toBeNull();
    expect(validateActionValue("set", 5.5, { max: 5 })?.code).toBe("invalid_value");
    expect(validateActionValue("toggle", undefined, nestedMeta.items!.nested!.parts.active!)).toBeNull();
  });
});
