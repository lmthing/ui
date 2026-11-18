import { describe, expect, it } from "vitest";
import type { Meta } from "../meta";
import { projectSelection, selectionAt, selectionChanges, selectionError } from "./selection";

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
