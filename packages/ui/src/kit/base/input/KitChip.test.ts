import { createElement } from "react";
import * as jsx from "react/jsx-dev-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it, vi } from "vitest";
import { components, themeName } from "@lmthing/ui/catalog";
import {
  KitChip,
  KitProvider,
  KitTrack,
  PartScope,
  createScreenController,
  type ScreenController,
} from "@lmthing/ui/kit";
import { config, elementAt } from "../../../../test/render";

vi.mock("react/jsx-dev-runtime", { spy: true });
type ChipProps = Parameters<typeof KitChip>[0];
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const chip = { item: "r1", label: "Headache", on: true, role: "checkbox" } as const;
function render(input: ChipProps, controller?: ScreenController, track = false) {
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
          { screen: "home", component: "c1", rev: 1, state: "filled", children: null },
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
