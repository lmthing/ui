import * as jsxRuntime from "react/jsx-dev-runtime";
import { expect, it, vi } from "vitest";
import { createScreenController } from "@lmthing/ui/kit";
import { seatMoveDefs, seatMoveScreen } from "./seat-move.fixture";
import { renderSeatMoves } from "./seat-move.ssr";

vi.mock("react/jsx-dev-runtime", { spy: true });
vi.mock("tamagui", async (original) => ({
  ...(await original<typeof import("tamagui")>()),
  isWeb: false,
}));

type NativeTarget = {
  testID?: string;
  accessible?: boolean;
  accessibilityActions?: { name: string; label: string }[];
  onAccessibilityAction?: (event: { nativeEvent: { actionName: string } }) => void;
};

it.each([
  ["r1", "Ari Shah", "Cherry", ["Birch", "Cherry"], ["Oak", "Birch"]],
  ["r3", "Cam Cole", "Birch", ["Birch", "Cherry"], ["Cherry"]],
] as const)(
  "dispatches the native move action at %s with the exact destination label",
  async (row, name, destination, choices, next) => {
    const controller = createScreenController({ screen: seatMoveScreen, defs: seatMoveDefs });
    const act = vi.spyOn(controller, "act");
    const address = `home/c1/${row}/root`;
    const { jsxDEV } = await vi.importActual<typeof jsxRuntime>("react/jsx-dev-runtime");
    let guest: NativeTarget | undefined;
    const spy = vi.spyOn(jsxRuntime, "jsxDEV").mockImplementation((...args) => {
      const target = args[1] as NativeTarget;
      if (target.testID === address && target.accessible) guest = target;
      return jsxDEV(...args);
    });
    try {
      renderSeatMoves(controller);
      expect(guest?.accessibilityActions?.map(({ label }) => label)).toEqual(
        choices.map((label) => `Move ${name} to ${label}`),
      );
      guest!.onAccessibilityAction!({ nativeEvent: { actionName: "unknown" } });
      expect(act).not.toHaveBeenCalled();
      const choice = guest!.accessibilityActions!.find(
        ({ label }) => label === `Move ${name} to ${destination}`,
      )!;
      guest!.onAccessibilityAction!({ nativeEvent: { actionName: choice.name } });
      expect(act).toHaveBeenCalledExactlyOnceWith({ address, action: "move", value: destination });
      expect(controller.read()).toContain(
        `[c1/${row} move = "${destination}"; choices ${JSON.stringify(next)}]`,
      );
    } finally {
      spy.mockRestore();
      controller.dispose();
    }
  },
);
