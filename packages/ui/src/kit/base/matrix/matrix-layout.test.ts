import { describe, expect, it, vi } from "vitest";
import { Children, createElement, isValidElement, type ReactNode } from "react";
import { YStack } from "tamagui";
import { component, radius, size } from "@lmthing/ui/catalog";
import { KitCheck, KitInput, KitText } from "@lmthing/ui/kit";
import { disabledContent, loadingGeometry, loadingRadius, matrixKey, transposeWeek } from "./matrix-layout";

describe("matrix layout", () => {
  it("transposes headings and preserves caller cells, targets and disabled states", () => {
    const cell = { id: "c1", content: "One", target: { item: "r1", part: "value" }, disabled: true };
    const result = transposeWeek(
      [
        { id: "d1", label: "Monday", header: "Mon" },
        { id: "d2", label: "Tuesday", header: "Tue" },
      ],
      [{ id: "r1", label: "First", heading: "First heading", cells: [cell] }],
    );
    expect(result.columns).toEqual([{ id: "r1", label: "First", header: "First heading" }]);
    expect(result.rows[0]?.cells[0]).toBe(cell);
    expect(result.rows[1]?.cells[0]?.content).toBeNull();
  });
  it("supports keyboard scrolling without intercepting child controls", () => {
    const node = { scrollBy: vi.fn(), clientWidth: 200, scrollLeft: 20, scrollWidth: 800 };
    const preventDefault = vi.fn();
    for (const key of ["ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End"])
      matrixKey({ key, target: node, currentTarget: node, preventDefault });
    expect(node.scrollBy.mock.calls.map(([call]) => call.left)).toEqual([
      -size.control.md,
      size.control.md,
      -200,
      200,
      -20,
      780,
    ]);
    matrixKey({ key: "ArrowRight", target: {}, currentTarget: node, preventDefault });
    matrixKey({ key: "Escape", target: node, currentTarget: node, preventDefault });
    expect(node.scrollBy).toHaveBeenCalledTimes(6);
  });
});

describe("matrix loading radii", () => {
  it.each([
    { shift: -1 as const, input: radius.sm, photo: radius.md },
    { shift: 0 as const, input: radius.md, photo: radius.lg },
    { shift: 1 as const, input: radius.lg, photo: radius.xl },
  ])("retains themed input and photo corners at shift $shift", ({ shift, input, photo }) => {
    expect(loadingRadius({ hint: "Score", compact: true }, shift)).toBe(input);
    expect(loadingRadius({ label: "Add", icon: "plus" }, shift)).toBe(input);
    for (const shape of ["wide", "square", "tall"])
      expect(loadingRadius({ photo: "lib:object", shape }, shift)).toBe(photo);
    expect(loadingRadius({ initials: "AB" }, shift)).toBe(radius.pill);
    expect(loadingRadius({ photo: "lib:object", shape: "round" }, shift)).toBe(radius.pill);
    expect(loadingRadius({ photo: "lib:object", shape: "avatar" }, shift)).toBe(radius.pill);
    expect(loadingRadius({ icon: "plus" }, shift)).toBe(radius.pill);
  });
});

describe("matrix disabled content", () => {
  it("mutes nested text and disables children without changing their parts or source props", () => {
    const text = createElement(KitText, { part: "name", tone: "accent", children: "Caller label" });
    const check = createElement(KitCheck, { part: "check", done: false, label: "Caller check" });
    const source = createElement(YStack, { children: [text, check] });
    const disabled = Children.toArray(disabledContent(source))[0];
    if (!isValidElement<{ children: ReactNode; disabled?: boolean }>(disabled))
      throw new Error("Expected the caller's wrapper");
    expect(disabled.props.disabled).toBe(true);
    const children = Children.toArray(disabled.props.children);
    expect(children[0]).toMatchObject({ props: { part: "name", tone: "muted", children: "Caller label" } });
    expect(children[1]).toMatchObject({ props: { part: "check", done: false, disabled: true } });
    expect(text.props.tone).toBe("accent");
    expect(check.props.disabled).toBeUndefined();
    expect(source.props.children).toEqual([text, check]);
  });
  it("preserves caller text and numeric values, including zero", () => {
    expect(disabledContent(["Caller value", 0, false, null])).toEqual(["Caller value", 0]);
    expect(disabledContent(null)).toBeNull();
  });
  it("uses the existing inactive drawing for disabled inputs without mutating caller props", () => {
    const input = createElement(KitInput, { hint: "Score", part: "score", value: "12" });
    expect(Children.toArray(disabledContent(input))[0]).toMatchObject({
      props: { hint: "Score", part: "score", value: "12", disabled: true, inactive: true },
    });
    expect(input.props.inactive).toBeUndefined();
  });
});

describe("matrix child loading geometry", () => {
  it("matches controls, icons, initials and every photo aspect", () => {
    expect(loadingGeometry({ done: false })).toEqual({ width: size.control.md, height: size.control.md });
    expect(loadingGeometry({ hint: "Score" })?.minHeight).toBe(
      size.control.md + component.base.borderWidth * 2,
    );
    expect(loadingGeometry({ name: "plus", scale: "lg" })).toEqual({
      width: size.icon.lg,
      height: size.icon.lg,
    });
    expect(loadingGeometry({ initials: "AB", shape: "wide" })).toEqual({
      width: size.avatar.md,
      height: size.avatar.md,
    });
    for (const [shape, ratio] of [
      ["wide", component.base.wideRatio],
      ["tall", component.base.tallRatio],
      ["square", 1],
    ] as const)
      expect(loadingGeometry({ photo: "lib:object", shape })).toEqual({ width: "100%", aspectRatio: ratio });
    expect(loadingGeometry({ photo: "lib:object", shape: "avatar" })).toEqual({
      width: size.avatar.lg,
      height: size.avatar.lg,
    });
    expect(loadingGeometry({})).toBeUndefined();
  });
});
