import * as runtime from "react/jsx-dev-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { expect, it, vi } from "vitest";
import { themeName } from "@lmthing/ui/catalog";
import {
  createScreenController,
  KitInput,
  KitProvider,
  PartScope,
  type ScreenController,
} from "@lmthing/ui/kit";
import { config, elementAt } from "../../render";
import { dateAddress, dateDefs, dateScreen, dateTheme } from "./index";

vi.mock("react/jsx-dev-runtime", { spy: true });
vi.mock("tamagui", async (original) => ({
  ...(await original<typeof import("tamagui")>()),
  isWeb: false,
}));

type Input = Parameters<typeof KitInput>[0];
type NativeTarget = { testID?: string; onChangeText?: (value: string) => void; editable?: boolean };
const input = { hint: "YYYY-MM-DD", kind: "date", part: "date", value: "2026-11-21" } as const;

async function captureInput(props: Input, controller: ScreenController) {
  const { jsxDEV } = await vi.importActual<typeof runtime>("react/jsx-dev-runtime");
  let target: NativeTarget | undefined;
  const spy = vi.spyOn(runtime, "jsxDEV").mockImplementation((...args) => {
    const candidate = args[1] as NativeTarget;
    if (candidate.testID === dateAddress && "editable" in candidate) target = candidate;
    return jsxDEV(...args);
  });
  try {
    const html = renderToStaticMarkup(
      <TamaguiProvider config={config} defaultTheme={themeName(dateTheme)}>
        <KitProvider theme={dateTheme} interactive controller={controller}>
          <PartScope screen="home" component="c1" rev={1} state="filled">
            <KitInput {...props} />
          </PartScope>
        </KitProvider>
      </TamaguiProvider>,
    );
    return { target: target!, field: elementAt(html, dateAddress) };
  } finally {
    spy.mockRestore();
  }
}

it("only sends complete, real ISO dates from native onChangeText", async () => {
  const controller = createScreenController({ screen: dateScreen, defs: dateDefs });
  const act = vi.spyOn(controller, "act");
  const edit = vi.spyOn(controller, "edit");
  try {
    const { target } = await captureInput({ ...input, action: "set", projected: true }, controller);
    const before = controller.store.snapshot();
    for (const text of ["", "2024", "2024-02-", "2024-2-29", "2026-02-29", "2026-04-31", "2026-11-21 "])
      target.onChangeText!(text);
    expect(act).not.toHaveBeenCalled();
    expect(edit).not.toHaveBeenCalled();
    expect(controller.store.snapshot()).toEqual(before);
    target.onChangeText!("2024-02-29");
    expect(act).toHaveBeenCalledExactlyOnceWith({ address: dateAddress, action: "set", value: "2024-02-29" });
    expect(controller.snapshotScreen().components[0]?.on).toBe("2024-02-29");
  } finally {
    controller.dispose();
  }
});

it("does not mark a default date input as a setter or let a disabled setter edit", async () => {
  const controller = createScreenController({ screen: dateScreen, defs: dateDefs });
  const edit = vi.spyOn(controller, "edit");
  try {
    const typed = await captureInput(input, controller);
    expect(typed.field.attributes).not.toContain("data-set-kind");
    typed.target.onChangeText!("2024");
    expect(edit).toHaveBeenCalledExactlyOnceWith(dateAddress, "2024");
    const disabled = await captureInput({ ...input, action: "set", disabled: true }, controller);
    expect(disabled.target.editable).toBe(false);
    expect(disabled.target.onChangeText).toBeUndefined();
    expect(disabled.field.attributes).toContain('aria-disabled="true"');
  } finally {
    controller.dispose();
  }
});
