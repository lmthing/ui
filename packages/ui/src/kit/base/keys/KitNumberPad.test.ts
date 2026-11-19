import { createElement } from "react";
import * as runtime from "react/jsx-dev-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { localeOf, size, text, themeName, type Definition } from "@lmthing/ui/catalog";
import {
  KitNumberPad,
  KitProvider,
  PartScope,
  createScreenController,
  type ScreenController,
} from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

vi.mock("react/jsx-dev-runtime", { spy: true });
const keys = [
  { id: "r1", label: "1", value: "1" },
  { id: "r2", label: ".", value: ".", disabled: true },
  { id: "r3", label: "⌫", value: "backspace" },
];
const input = { label: "Value", value: "12.5", keys, target: { part: "value" } };
function render(props: Parameters<typeof KitNumberPad>[0], controller?: ScreenController) {
  const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
  return renderToStaticMarkup(
    createElement(
      TamaguiProvider,
      { config, defaultTheme: themeName(theme) },
      createElement(
        KitProvider,
        { theme, interactive: true, controller, children: null },
        createElement(
          PartScope,
          { screen: "home", component: "c1", rev: 1, state: "filled", children: null },
          createElement(KitNumberPad, props),
        ),
      ),
    ),
  );
}
describe("KitNumberPad", () => {
  it("draws addressed values, three equal columns and unavailable keys", () => {
    const html = render(input);
    expect(elementAt(html, "home/c1/value").attributes).not.toContain('role="button"');
    expect(html).not.toContain('role="textbox"');
    expect(html).toContain("12.5");
    for (const key of keys) {
      const node = elementAt(html, `home/c1/${key.id}/root`);
      expect(styleAt(html, node)).toContain("width:33.333");
      const hit = node.children[0]!;
      expect(hit.attributes).toContain('role="button"');
      expect(styleAt(html, hit)).toContain(`min-height:${size.control.lg}px`);
      expect(styleAt(html, hit)).toContain(`min-width:${size.control.md}px`);
    }
    expect(elementAt(html, "home/c1/r2/root").children[0]!.attributes).toContain('aria-disabled="true"');
  });
  it.each([undefined, "r4"])("mounts a separate value and textbox at target item %s", (item) => {
    const target = item ? { item, part: "pad" } : { part: "pad" };
    const html = render({ ...input, part: "pad", displayPart: "value", target });
    const destination = item ? `home/c1/${item}/pad` : "home/c1/pad";
    const display = elementAt(html, "home/c1/value");
    const keypad = elementAt(html, destination);
    expect(html).toContain(`${display.attributes}12.5`);
    expect(display.attributes).not.toContain('role="textbox"');
    expect(keypad.attributes).toContain('role="textbox"');
    expect(keypad.attributes).toContain('aria-label="Value"');
    const description = keypad.attributes.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(description).toBeTruthy();
    expect(html).toContain(`id="${description}"`);
    expect(keypad.children).toHaveLength(keys.length);
    const addresses = [...html.matchAll(/data-testid="([^"]+)"/g)].map((match) => match[1]);
    expect(new Set(addresses).size).toBe(addresses.length);
    const loading = render({ ...input, part: "pad", displayPart: "value", target, loading: true });
    expect(loading).not.toContain('role="textbox"');
    expect(loading).not.toContain(`data-testid="${destination}"`);
  });
  it("keeps one value address in legacy mode even if the wrapper uses the same part", () => {
    const html = render({ ...input, part: "value" });
    expect(html.match(/data-testid="home\/c1\/value"/g)).toHaveLength(1);
    expect(html).not.toContain('role="textbox"');
  });
  it.each(["", "12.5"])("keeps %s value geometry and removes loading key actions", (value) => {
    const filled = render({ ...input, value });
    const loading = render({ ...input, value, loading: true });
    expect(loading).not.toContain('role="button"');
    expect(loading).not.toContain('data-testid="home/c1/r1/root"');
    expect(elementAt(loading, "home/c1/root").children[1]!.children).toHaveLength(keys.length);
    expect(elementAt(filled, "home/c1/root").children[1]!.children).toHaveLength(keys.length);
    expect(loading).toContain('aria-busy="true"');
    expect(render({ ...input, keys: [], value: "" })).toContain('data-testid="home/c1/value"');
  });
});

describe("KitNumberPad dispatch", () => {
  it.each([false, true])("dispatches the caller's keys on press and keyboard (split: %s)", async (split) => {
    const act = vi.fn();
    const controller = { act } as unknown as ScreenController;
    const handlers: {
      role?: string;
      onPress?: () => void;
      onKeyDown?: (event: { key: string; preventDefault(): void }) => void;
    }[] = [];
    let textKey: (typeof handlers)[number]["onKeyDown"];
    const { jsxDEV } = await vi.importActual<typeof runtime>("react/jsx-dev-runtime");
    const spy = vi.spyOn(runtime, "jsxDEV").mockImplementation((...args) => {
      const props = args[1] as (typeof handlers)[number];
      if (props.onPress) handlers.push(props);
      if (props.role === "textbox") textKey = props.onKeyDown;
      return jsxDEV(...args);
    });
    const digit = split ? { append: "1" } : "1";
    const erase = split ? { backspace: true as const } : "backspace";
    try {
      render(
        {
          ...input,
          ...(split ? { displayPart: "value" } : {}),
          keys: [{ ...keys[0]!, value: digit }, keys[1]!, { ...keys[2]!, value: erase }],
          target: { item: "r4", part: split ? "pad" : "field" },
        },
        controller,
      );
    } finally {
      spy.mockRestore();
    }
    expect(handlers).toHaveLength(2);
    handlers[0]!.onPress!();
    handlers[1]!.onKeyDown!({ key: "Enter", preventDefault: vi.fn() });
    textKey?.({ key: "1", preventDefault: vi.fn() });
    textKey?.({ key: ".", preventDefault: vi.fn() });
    const address = `home/c1/r4/${split ? "pad" : "field"}`;
    expect(act.mock.calls).toEqual([
      [{ address, action: "type", value: digit }],
      [{ address, action: "type", value: erase }],
      ...(split ? [[{ address, action: "type", value: digit }]] : []),
    ]);
  });
});

it.each(["amount", "root"])("keeps the %s display and reading in sync after typing and clearing", (part) => {
  const format = new Intl.NumberFormat(localeOf(), { useGrouping: false, maximumSignificantDigits: 21 });
  const initial = part === "amount" ? 1e-7 : 2;
  const shownInitial = part === "amount" ? "0.0000001" : "2";
  const address = `home/c1/${part}`;
  const draftKey = address.replace(/\/root$/, "");
  const relative = draftKey.replace("home/", "");
  const definition: Definition = {
    meta: {
      id: "Fixture",
      group: "input",
      purpose: "Enter a number",
      pick: "Enter a number",
      region: "body",
      weight: 1,
      tier: "phone",
      realPath: "Local entry",
      actions: { parts: { [part]: ["type"] } },
      read: (input) => {
        const { value } = input as { value?: string | number };
        return value === "" ? [] : [`Current ${typeof value === "number" ? format.format(value) : value}`];
      },
    },
    props: z.strictObject({ label: text(20), value: z.number() }).meta({ keypadParts: [part] }),
    fallback: () => ({ label: "Value", value: 2 }),
    examples: [],
    probes: [],
  };
  const controller = createScreenController({
    screen: { id: "home", components: [{ id: "c1", c: "Fixture", label: "Value", value: initial }] },
    defs: { Fixture: definition },
  });
  const shown = () => {
    const html = render(
      {
        ...input,
        target: { part },
        displayPart: "value",
        value: String(controller.store.get(draftKey) ?? format.format(initial)),
      },
      controller,
    );
    const display = elementAt(html, "home/c1/value");
    return html.slice(html.indexOf(display.attributes) + display.attributes.length).split("<")[0];
  };
  expect(shown()).toBe(shownInitial);
  expect(controller.read()).toContain(`Current ${shownInitial}`);
  expect(controller.act({ address, action: "type", value: { backspace: true } }).ok).toBe(true);
  expect(shown()?.trim()).toBe(shownInitial.slice(0, -1));
  expect(controller.act({ address, action: "type", value: "24.50" }).ok).toBe(true);
  expect(shown()).toBe("24.50");
  expect(controller.read()).toContain(`Current 24.50 — "Value" [${relative} type = "24.50"]`);
  expect(controller.act({ address, action: "type", value: { clear: true } }).ok).toBe(true);
  expect(shown()?.trim()).toBe("");
  expect(controller.read()).toContain(`Fixture "Value" [${relative} type = ""]`);
});
