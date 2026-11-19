import { createElement, type ReactNode } from "react";
import * as runtime from "react/jsx-dev-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it, vi } from "vitest";
import { themeName } from "@lmthing/ui/catalog";
import {
  KitAction,
  KitProvider,
  KitText,
  KitTile,
  KitTrail,
  PartScope,
  type ScreenController,
} from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

vi.mock("react/jsx-dev-runtime", { spy: true });
const actions = [
  "press",
  "dismiss",
  "play",
  "pause",
  "toggle",
  "select",
  "check",
  "set",
  "type",
  "increment",
  "decrement",
  "start",
  "stop",
  "send",
  "scan",
] as const;
type Handler = {
  testID?: string;
  onPress?: (event?: object) => unknown;
  onKeyDown?: (event: { key: string; preventDefault(): void }) => unknown;
};
async function capture(
  child: ReactNode,
  state: "filled" | "loading" = "filled",
  offered: readonly string[] = actions,
) {
  const act = vi.fn(),
    press = vi.fn();
  const controller = {
    act,
    press,
    canPress: () => true,
    actionsAt: () => offered,
    store: { subscribe: () => () => {}, get: () => undefined },
  } as unknown as ScreenController;
  const targets = new Map<string, Handler>();
  const { jsxDEV } = await vi.importActual<typeof runtime>("react/jsx-dev-runtime");
  const spy = vi.spyOn(runtime, "jsxDEV").mockImplementation((...args) => {
    const props = args[1] as Handler;
    if (props.testID) targets.set(props.testID, props);
    return jsxDEV(...args);
  });
  const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
  let html: string;
  try {
    html = renderToStaticMarkup(
      createElement(
        TamaguiProvider,
        { config, defaultTheme: themeName(theme) },
        createElement(
          KitProvider,
          { theme, controller, interactive: true, children: null },
          createElement(PartScope, { screen: "home", component: "c1", rev: 1, state, children: null }, child),
        ),
      ),
    );
  } finally {
    spy.mockRestore();
  }
  return { html, targets, act, press };
}
describe("KitAction wave 2 declared actions and values", () => {
  it.each(actions)(
    "dispatches %s through controller validation instead of press inference",
    async (action) => {
      for (const value of ["key", 2.5, true, undefined]) {
        const result = await capture(
          createElement(KitAction, { action, label: "Action", ...(value === undefined ? {} : { value }) }),
        );
        result.targets.get("home/c1/root")!.onPress!();
        expect(result.act).toHaveBeenCalledWith({
          address: "home/c1/root",
          action,
          ...(value === undefined ? {} : { value }),
        });
        expect(result.press).not.toHaveBeenCalled();
      }
    },
  );
  it("keeps implicit press and suppresses disabled, loading and undeclared actions", async () => {
    const defaultAction = await capture(createElement(KitAction, { label: "Action" }));
    defaultAction.targets.get("home/c1/root")!.onPress!();
    expect(defaultAction.press).toHaveBeenCalledWith("home/c1/root");
    for (const disabled of [false, true]) {
      const result = await capture(
        createElement(KitAction, { label: "Action", action: "set", disabled }),
        "filled",
        [],
      );
      expect(result.targets.get("home/c1/root")!.onPress).toBeUndefined();
    }
    const loading = await capture(createElement(KitAction, { label: "Action" }), "loading");
    expect(loading.targets.get("home/c1/root")!.onPress).toBeUndefined();
  });
});
describe("KitTile wave 2 selected, detail and declared root actions", () => {
  it.each(["press", "toggle", "start", "stop"] as const)("dispatches %s at the item root", async (action) => {
    const result = await capture(
      createElement(KitTile, {
        item: "r1",
        icon: "clock",
        label: "Timer",
        on: true,
        action,
        detail: createElement(KitText, { role: "caption", part: "detail", children: "00:30" }),
      }),
    );
    const root = elementAt(result.html, "home/c1/r1/root");
    expect(root.attributes).toContain('aria-pressed="true"');
    expect(styleAt(result.html, root)).toContain("var(--accentSoft)");
    expect(result.html).toContain('data-testid="home/c1/r1/detail"');
    result.targets.get("home/c1/r1/root")!.onKeyDown!({ key: "Enter", preventDefault: vi.fn() });
    expect(result.act).toHaveBeenCalledWith({ address: "home/c1/r1/root", action });
  });
  it("routes links through the controller and blocks disabled/loading tiles", async () => {
    const linked = await capture(
      createElement(KitTile, { item: "r1", icon: "clock", label: "Timer", goto: "next" }),
    );
    linked.targets.get("home/c1/r1/root")!.onPress!();
    expect(linked.press).toHaveBeenCalledWith("home/c1/r1/root");
    for (const state of ["filled", "loading"] as const) {
      const result = await capture(
        createElement(KitTile, {
          item: "r1",
          icon: "clock",
          label: "Timer",
          action: "toggle",
          disabled: true,
        }),
        state,
      );
      expect(result.targets.get("home/c1/r1/root")!.onPress).toBeUndefined();
    }
  });
});
describe("KitTrail wave 2 pending switches and status tones", () => {
  it.each(["good", "warn", "bad"] as const)(
    "draws %s status pills with matching theme roles",
    async (tone) => {
      const result = await capture(createElement(KitTrail, { kind: "badge", value: "Status", tone }));
      const badge = elementAt(result.html, "home/c1/trail").children[0]!;
      expect(styleAt(result.html, badge)).toContain(`var(--${tone}Soft)`);
      expect(styleAt(result.html, badge.children[0]!.children[0]!)).toContain(`var(--${tone})`);
    },
  );
  it("retains disabled switch state but offers no press", async () => {
    const enabled = await capture(createElement(KitTrail, { kind: "toggle", on: true }));
    enabled.targets.get("home/c1/trail")!.onPress!({});
    expect(enabled.press).toHaveBeenCalledWith("home/c1/trail");
    const disabled = await capture(createElement(KitTrail, { kind: "toggle", on: true, disabled: true }));
    expect(elementAt(disabled.html, "home/c1/trail").attributes).toContain('aria-checked="true"');
    expect(disabled.targets.get("home/c1/trail")!.onPress).toBeUndefined();
  });
  it.each([false, true])("loading hides the %s state in a neutral toggle silhouette", async (on) => {
    const result = await capture(createElement(KitTrail, { kind: "toggle", on }), "loading");
    const frame = elementAt(result.html, "home/c1/trail");
    expect(frame.attributes).not.toContain("aria-checked");
    expect(frame.children[0]!.children).toHaveLength(0);
    expect(styleAt(result.html, frame.children[0]!)).toContain("background-color:var(--line)");
    expect(result.targets.get("home/c1/trail")!.onPress).toBeUndefined();
  });
});
