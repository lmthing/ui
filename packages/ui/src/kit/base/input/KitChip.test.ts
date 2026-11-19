import { createElement } from "react";
import * as jsx from "react/jsx-dev-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it, vi } from "vitest";
import { component, components, size, space, themeName } from "@lmthing/ui/catalog";
import {
  KitChip,
  KitProvider,
  KitTrack,
  PartScope,
  createScreenController,
  type ScreenController,
} from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

vi.mock("react/jsx-dev-runtime", { spy: true });
type ChipProps = Parameters<typeof KitChip>[0];
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const chip = { item: "r1", label: "Headache", on: true, role: "checkbox" } as const;
function render(
  input: ChipProps,
  controller?: ScreenController,
  track = false,
  state: "filled" | "loading" = "filled",
) {
  const content = createElement(KitChip, input);
  return renderToStaticMarkup(
    createElement(
      TamaguiProvider,
      { config, defaultTheme: themeName(theme) },
      createElement(
        KitProvider,
        { theme, controller, interactive: Boolean(controller), children: null },
        createElement(
          PartScope,
          { screen: "home", component: "c1", rev: 1, state, children: null },
          track ? createElement(KitTrack, { part: "field", children: content }) : content,
        ),
      ),
    ),
  );
}
async function capture(input: ChipProps, controller: ScreenController, track = false) {
  const hits: { testID?: string; onPress?: () => void; accessibilityRole?: string }[] = [];
  const { jsxDEV } = await vi.importActual<typeof jsx>("react/jsx-dev-runtime");
  const spy = vi.spyOn(jsx, "jsxDEV").mockImplementation((...args) => {
    const props = args[1] as (typeof hits)[number];
    if (props.accessibilityRole === input.role) hits.push(props);
    return jsxDEV(...args);
  });
  try {
    render(input, controller, track);
  } finally {
    spy.mockRestore();
  }
  return hits.at(-1)!;
}

describe("KitChip optional named parts", () => {
  it.each(["pill", "segment"] as const)("keeps default %s markup and addresses identical", (look) => {
    const input = { ...chip, look };
    const body = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, "");
    expect(body(render(input))).toBe(body(render({ ...input, part: "root", labelPart: "label" })));
    expect(elementAt(render(input), "home/c1/r1/root").attributes).toContain('role="checkbox"');
    expect(elementAt(render(input), "home/c1/r1/label")).toBeDefined();
  });
  it.each(["checkbox", "radio", "tab"] as const)("addresses a named %s without a duplicate label", (role) => {
    const html = render({ ...chip, role, part: "symptom_1", labelPart: null });
    const hit = elementAt(html, "home/c1/r1/symptom_1").attributes;
    expect(hit).toContain(`role="${role}"`);
    expect(hit).toContain('aria-label="Headache"');
    expect(hit).toContain(role === "tab" ? 'aria-selected="true"' : 'aria-checked="true"');
    expect(html).not.toContain('data-testid="home/c1/r1/root"');
    expect(html).not.toContain('data-testid="home/c1/r1/label"');
    expect(html).toContain("Headache");
  });
  it("supports a separate caller-owned label part", () => {
    const html = render({ ...chip, part: "symptom_1", labelPart: "symptom_label_1" });
    expect(elementAt(html, "home/c1/r1/symptom_label_1")).toBeDefined();
  });
  it("keeps unstamped track selections unchanged even with named-part props", async () => {
    const act = vi.fn();
    const controller = { act } as unknown as ScreenController;
    const input = { ...chip, item: null, role: "radio", part: "unused", labelPart: "unused" } as const;
    const html = render(input, controller, true);
    expect(html).not.toContain("home/c1/r1");
    expect(html).not.toContain('data-testid="home/c1/unused"');
    (await capture(input, controller, true)).onPress!();
    expect(act).toHaveBeenCalledWith({ address: "home/c1/field", action: "select", value: "Headache" });
  });
  it("dispatches an explicit value independently of the displayed choice label", async () => {
    const act = vi.fn();
    const controller = { act } as unknown as ScreenController;
    const input = { ...chip, item: null, role: "radio", label: "[US]", value: "US" } as const;
    expect(render(input, controller, true)).toContain('aria-label="[US]"');
    (await capture(input, controller, true)).onPress!();
    expect(act).toHaveBeenCalledWith({ address: "home/c1/field", action: "select", value: "US" });
  });
});

describe("KitChip variant options", () => {
  it.each(["pill", "segment", "box"] as const)(
    "draws fixed swatches in the %s without addressing them",
    (look) => {
      const html = render({ ...chip, look, swatch: "navy", part: "option" });
      const hit = elementAt(html, "home/c1/r1/option");
      const face = hit.children[0]!;
      const mark = face.children[0]!;
      expect(mark.attributes).toContain('aria-hidden="true"');
      expect(styleAt(html, mark)).toContain(component.swatch.navy);
      expect(styleAt(html, face)).toContain(`min-width:${size.control.md}px`);
      expect(styleAt(html, face)).toContain(
        `min-height:${look === "segment" ? size.control.sm : size.control.md}px`,
      );
      expect(elementAt(html, "home/c1/r1/label")).toBeDefined();
    },
  );
  it("keeps unavailable choices readable and blocks both controller dispatch paths", async () => {
    const controller = { press: vi.fn(), act: vi.fn() } as unknown as ScreenController;
    for (const item of ["r1", null]) {
      const input = { ...chip, item, on: false, disabled: true, look: "box" } as const;
      const html = render(input, controller, true);
      expect(html).toContain('aria-disabled="true"');
      expect(html).toContain('aria-checked="false"');
      expect(html).toContain("line-through");
      expect((await capture(input, controller, true)).onPress).toBeUndefined();
    }
  });
  it("softens disabled decoration and leaves room between variant segments", () => {
    const input = { ...chip, look: "segment", swatch: "navy", disabled: true } as const;
    const html = render(input);
    const hit = elementAt(html, "home/c1/r1/root");
    const face = hit.children[0]!;
    expect(styleAt(html, hit)).toContain(`padding-left:${space.xs}px`);
    expect(styleAt(html, face)).toContain("border-left-color:var(--line)");
    expect(styleAt(html, face.children[0]!)).toContain(`opacity:${component.base.disabledOpacity}`);
    expect(styleAt(html, "home/c1/r1/label")).toContain("color:var(--text)");
    const normal = render({ ...chip, look: "segment" });
    expect(styleAt(normal, "home/c1/r1/root")).not.toContain(`padding-left:${space.xs}px`);
  });
  it("renders loading variants without a control and lets callers omit the control part", async () => {
    const controller = { press: vi.fn() } as unknown as ScreenController;
    const input = { ...chip, look: "box", swatch: "navy", part: null, labelPart: null } as const;
    const staticHtml = render(input);
    expect(staticHtml).not.toContain('data-testid="home/c1/r1/');
    expect((await capture(input, controller)).onPress).toBeUndefined();
    const html = render({ ...input, part: "root", labelPart: "label" }, controller, false, "loading");
    expect(html).not.toContain('data-testid="home/c1/r1/');
    expect(html).not.toContain('role="checkbox"');
    expect(html).not.toContain('aria-label="Headache"');
    expect(html).toContain('aria-hidden="true"');
  });
});
describe("KitChip dispatch", () => {
  it("dispatches default and named chips through the same controller press path", async () => {
    const press = vi.fn();
    const controller = { press } as unknown as ScreenController;
    (await capture(chip, controller)).onPress!();
    expect(press).toHaveBeenLastCalledWith("home/c1/r1/root");
    (await capture({ ...chip, part: "symptom_1", labelPart: null }, controller)).onPress!();
    expect(press).toHaveBeenLastCalledWith("home/c1/r1/symptom_1");
    expect((await capture(chip, undefined as unknown as ScreenController)).onPress).toBeUndefined();
  });
  it("dispatches repeated declared nested toggles without changing other symptoms", async () => {
    const controller = createScreenController({
      screen: {
        id: "home",
        components: [{ id: "c1", c: "SymptomLog", ...components.SymptomLog.examples[0] }],
      },
      defs: components,
    });
    try {
      const hit = await capture({ ...chip, part: "symptom_1", labelPart: null }, controller);
      hit.onPress!();
      expect(controller.store.get("home/c1/r1/symptom_1")).toBe(false);
      hit.onPress!();
      expect(controller.store.get("home/c1/r1/symptom_1")).toBe(true);
      expect(controller.store.get("home/c1/r1/symptom_2")).toBeUndefined();
    } finally {
      controller.dispose();
    }
  });
});
