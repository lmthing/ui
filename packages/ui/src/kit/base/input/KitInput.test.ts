import { createElement } from "react";
import * as runtime from "react/jsx-dev-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it, vi } from "vitest";
import { presets, size, themeName, type as typography } from "@lmthing/ui/catalog";
import { KitCard, KitInput, KitProvider, PartScope, type ScreenController } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

vi.mock("react/jsx-dev-runtime", { spy: true });
function render(
  props: Parameters<typeof KitInput>[0],
  preset = "calm",
  mode = "light",
  controller?: ScreenController,
) {
  const theme = { preset, mode, accent: "moss" } as Parameters<typeof KitProvider>[0]["theme"];
  return renderToStaticMarkup(
    createElement(
      TamaguiProvider,
      { config, defaultTheme: themeName(theme) },
      createElement(
        KitProvider,
        { theme, controller, interactive: Boolean(controller), children: null },
        createElement(
          PartScope,
          { screen: "home", component: "c1", rev: 1, state: "filled", children: null },
          createElement(KitCard, { children: null }, createElement(KitInput, props)),
        ),
      ),
    ),
  );
}

describe("KitInput compact and inactive options", () => {
  it.each(presets)("keeps compact time controls readable and touchable in $id", ({ id }) => {
    for (const mode of ["light", "dark"]) {
      const html = render({ hint: "From", value: "09:00", kind: "time", compact: true }, id, mode);
      const field = elementAt(html, "home/c1/field");
      const css = styleAt(html, field);
      expect(field.attributes).toContain('role="textbox"');
      expect(field.attributes).toContain('value="09:00"');
      expect(css).toContain("width:0px");
      expect(css).toContain(`min-width:${size.control.md}px`);
      expect(css).toContain(`min-height:${size.control.md}px`);
      expect(css).toContain(`font-size:${typography.body.size}px`);
    }
  });
  it.each(presets)("uses theme roles, not disabling or opacity, for inactive hours in $id", ({ id }) => {
    for (const mode of ["light", "dark"]) {
      for (const compact of [false, true]) {
        const html = render({ hint: "To", value: "17:00", compact, inactive: true }, id, mode);
        const field = elementAt(html, "home/c1/field");
        const surface = elementAt(html, "home/c1/root").children[0]!.children[0]!;
        expect(styleAt(html, field)).toContain("color:var(--muted)");
        expect(styleAt(html, surface)).toContain("background-color:var(--surface)");
        expect(field.attributes).not.toContain("disabled");
        expect(styleAt(html, surface)).not.toContain("opacity:");
        expect(field.attributes).toContain('value="17:00"');
      }
    }
  });
  it.each(["text", "search", "time"] as const)("keeps the default %s drawing unchanged", (kind) => {
    const input = { hint: "Value", value: "09:00", kind };
    const body = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, "");
    expect(body(render(input))).toBe(body(render({ ...input, compact: false, inactive: false })));
    expect(styleAt(render(input), "home/c1/field")).not.toContain("width:0px");
    expect(styleAt(render(input), "home/c1/field")).toContain("color:var(--text)");
  });
});

async function captureInput(input: Parameters<typeof KitInput>[0], controller: ScreenController) {
  let captured: { onChangeText?: (value: string) => void } = {};
  const { jsxDEV } = await vi.importActual<typeof runtime>("react/jsx-dev-runtime");
  const spy = vi.spyOn(runtime, "jsxDEV").mockImplementation((...args) => {
    const props = args[1] as typeof captured & { testID?: string };
    if (props.testID === "home/c1/field") captured = props;
    return jsxDEV(...args);
  });
  try {
    render(input, "calm", "light", controller);
  } finally {
    spy.mockRestore();
  }
  return captured;
}
describe("KitInput numeric set accessibility", () => {
  it.each(["number", "date", "time"] as const)("draws disabled %s set controls", (kind) => {
    const html = render({ hint: "Value", kind, action: "set", disabled: true, min: 1, max: 5, step: 0.5 });
    const field = elementAt(html, "home/c1/field");
    expect(field.attributes).toContain('aria-disabled="true"');
    expect(field.attributes).toContain('disabled=""');
    expect(field.attributes).toContain(`role="${kind === "number" ? "spinbutton" : "textbox"}"`);
  });
  it.each([
    [undefined, undefined],
    ["", undefined],
    ["not a number", undefined],
    ["0", "0"],
    ["2.5", "2.5"],
  ] as const)("exposes numeric set value %s and finite bounds on the same addressed part", (value, now) => {
    const attrs = elementAt(
      render({ hint: "Weight", kind: "number", action: "set", value, min: 0, max: 1000, part: "weight_1" }),
      "home/c1/weight_1",
    ).attributes;
    expect(attrs).toContain('role="spinbutton"');
    expect(attrs).toContain('aria-valuemin="0"');
    expect(attrs).toContain('aria-valuemax="1000"');
    if (now === undefined) expect(attrs).not.toContain("aria-valuenow");
    else expect(attrs).toContain(`aria-valuenow="${now}"`);
  });
  it.each(["text", "search", "number", "date", "time"] as const)(
    "keeps %s type semantics and range attributes unchanged",
    (kind) => {
      const attrs = elementAt(
        render({ hint: "Value", kind, action: "type", min: 0, max: 5 }),
        "home/c1/field",
      ).attributes;
      expect(attrs).toContain(`role="${kind === "search" ? "searchbox" : "textbox"}"`);
      expect(attrs).not.toMatch(/aria-value(?:min|max|now)/);
    },
  );
  it("leaves unspecified bounds out", () => {
    const html = render({ hint: "Weight", kind: "number", action: "set", value: "4.5" });
    const attrs = elementAt(html, "home/c1/field").attributes;
    expect(attrs).toContain('aria-valuenow="4.5"');
    expect(attrs).not.toMatch(/aria-value(?:min|max)/);
  });
});

describe("KitInput wave 2 set and bounded edits", () => {
  it("keeps type as default, sends numeric/date set values and clamps stepped edits", async () => {
    const act = vi.fn(),
      edit = vi.fn();
    const controller = {
      act,
      edit,
      store: { subscribe: () => () => {}, get: () => undefined },
    } as unknown as ScreenController;
    const typed = await captureInput({ hint: "Value", kind: "number" }, controller);
    typed.onChangeText!("12.5");
    expect(edit).toHaveBeenLastCalledWith("home/c1/field", "12.5");
    const numeric = await captureInput(
      { hint: "Value", kind: "number", action: "set", min: 1, max: 5.2, step: 0.5 },
      controller,
    );
    for (const [text, value] of [
      ["0", 1],
      ["2.3", 2.5],
      ["9", 5],
      ["", ""],
    ] as const) {
      numeric.onChangeText!(text);
      expect(act).toHaveBeenLastCalledWith({ address: "home/c1/field", action: "set", value });
    }
    const dated = await captureInput({ hint: "Date", kind: "date", action: "set" }, controller);
    dated.onChangeText!("2026-11-19");
    expect(act).toHaveBeenLastCalledWith({ address: "home/c1/field", action: "set", value: "2026-11-19" });
    const disabled = await captureInput({ hint: "Value", disabled: true }, controller);
    expect(disabled.onChangeText).toBeUndefined();
  });
});
