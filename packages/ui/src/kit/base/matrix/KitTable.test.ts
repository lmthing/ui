import { createElement } from "react";
import * as jsxRuntime from "react/jsx-dev-runtime";
import { describe, expect, it, vi } from "vitest";
import { presets, size, component } from "@lmthing/ui/catalog";
import { KitInput, KitTable, type ScreenController } from "@lmthing/ui/kit";
import { elementAt, styleAt } from "../../../../test/render";
import { renderMatrix, text } from "./matrix-drawing.test";

vi.mock("react/jsx-dev-runtime", { spy: true });
const columns = ["a", "b"].map((id) => ({ id, label: id, header: text(id) }));
const rows = [
  {
    id: "r1",
    label: "First",
    heading: text("First", "name"),
    selected: true,
    target: { item: "r1", part: "root" },
    cells: [
      { id: "a1", content: text("One"), target: { item: "r1", part: "first" } },
      { id: "b1", content: text("Two"), target: { item: "r1", part: "second" }, disabled: true },
    ],
  },
];
const input = { columns, rows, corner: text("Rows") };

describe("KitTable", () => {
  it.each(presets)("keeps pinned labels, control widths and options in $id", ({ id }) => {
    for (const mode of ["light", "dark"]) {
      for (const stickyFirst of [false, true]) {
        const html = renderMatrix(
          createElement(KitTable, {
            ...input,
            stickyFirst,
            part: "matrix",
            activeColumn: "b",
            headerTargets: [{ column: "a", target: { part: "sort" } }],
            separators: ["r1"],
          }),
          undefined,
          id,
          mode,
        );
        expect(html.match(/data-testid="home\/c1\/matrix"/g)).toHaveLength(1);
        const root = elementAt(html, "home/c1/matrix");
        expect(root.children).toHaveLength(stickyFirst ? 2 : 1);
        for (const part of ["r1/root", "r1/first", "r1/second", "sort"]) {
          const node = elementAt(html, `home/c1/${part}`);
          expect(node.attributes).toContain('role="button"');
          expect(styleAt(html, node)).toContain(`min-width:${size.control.md}px`);
        }
        expect(elementAt(html, "home/c1/r1/second").attributes).toContain('aria-disabled="true"');
        expect(elementAt(html, "home/c1/r1/root").attributes).toContain('aria-pressed="true"');
        expect(styleAt(html, "home/c1/r1/first")).toContain(
          `border-bottom-width:${component.base.strongBorder}px`,
        );
      }
    }
  });
  it("keeps table dimensions and caller headings in empty and loading drawings", () => {
    const loading = renderMatrix(createElement(KitTable, { ...input, loading: true }));
    expect(loading).toContain('aria-busy="true"');
    expect(loading).not.toContain('role="button"');
    expect(loading).not.toContain('data-testid="home/c1/r1/name"');
    expect(loading).not.toContain('data-testid="home/c1/r1/first"');
    const empty = renderMatrix(createElement(KitTable, { ...input, rows: [] }));
    expect(empty).toContain("Rows");
    expect(empty).not.toContain("First");
    expect(
      renderMatrix(createElement(KitTable, { columns: [], rows: [], corner: null, loading: true })),
    ).toContain('aria-busy="true"');
  });
});

describe("KitTable disabled input cells", () => {
  it("mutes the actual input and restores its filled drawing when enabled again", () => {
    const field = createElement(KitInput, { hint: "Score", part: "score", value: "12" });
    for (const disabled of [false, true, false]) {
      const html = renderMatrix(
        createElement(KitTable, {
          columns,
          corner: text("Rows"),
          rows: [
            {
              id: "r1",
              label: "First",
              heading: text("First"),
              cells: [{ id: "score", content: field, disabled }],
            },
          ],
        }),
      );
      const input = elementAt(html, "home/c1/r1/score");
      expect(input.attributes).toContain('role="textbox"');
      expect(styleAt(html, input)).toMatch(
        new RegExp(`(?:^|;)\\s*color:\\s*var\\(--${disabled ? "muted" : "text"}\\)`),
      );
      if (disabled) expect(html).toContain('inert=""');
    }
    expect(field.props.inactive).toBeUndefined();
  });
});

describe("KitTable dispatch", () => {
  it("uses caller targets for native presses and keyboard actions, never disabled or loading targets", async () => {
    const press = vi.fn();
    const controller = { press } as unknown as ScreenController;
    const handlers = new Map<
      string,
      { onPress?: (event: object) => void; onKeyDown?: (event: object) => void }
    >();
    const { jsxDEV } = await vi.importActual<typeof jsxRuntime>("react/jsx-dev-runtime");
    const spy = vi.spyOn(jsxRuntime, "jsxDEV").mockImplementation((...args) => {
      const props = args[1] as {
        testID?: string;
        onPress?: (event: object) => void;
        onKeyDown?: (event: object) => void;
      };
      if (props.testID) handlers.set(props.testID, props);
      return jsxDEV(...args);
    });
    try {
      renderMatrix(createElement(KitTable, input), controller);
    } finally {
      spy.mockRestore();
    }
    const target = handlers.get("home/c1/r1/first")!;
    target.onPress!({ stopPropagation: vi.fn() });
    for (const key of ["Enter", " "])
      target.onKeyDown!({ key, preventDefault: vi.fn(), stopPropagation: vi.fn() });
    expect(press.mock.calls).toEqual(Array.from({ length: 3 }, () => ["home/c1/r1/first"]));
    expect(handlers.get("home/c1/r1/second")?.onPress).toBeUndefined();
  });
});
