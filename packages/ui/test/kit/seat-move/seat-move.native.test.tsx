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

it("dispatches a native accessibility action with the guest address and exact destination label", async () => {
  const controller = createScreenController({ screen: seatMoveScreen, defs: seatMoveDefs });
  const act = vi.spyOn(controller, "act");
  const address = "home/c1/r1/root";
  const { jsxDEV } = await vi.importActual<typeof jsxRuntime>("react/jsx-dev-runtime");
  let guest: NativeTarget | undefined;
  const spy = vi.spyOn(jsxRuntime, "jsxDEV").mockImplementation((...args) => {
    const target = args[1] as NativeTarget;
    if (target.testID === address && target.accessible) guest = target;
    return jsxDEV(...args);
  });
  try {
    renderSeatMoves(controller);
    expect(guest?.accessibilityActions?.map(({ label }) => label)).toEqual([
      "Move Ari Shah to Birch",
      "Move Ari Shah to Cherry",
    ]);
    guest!.onAccessibilityAction!({ nativeEvent: { actionName: "unknown" } });
    expect(act).not.toHaveBeenCalled();
    guest!.onAccessibilityAction!({ nativeEvent: { actionName: guest!.accessibilityActions![1]!.name } });
    expect(act).toHaveBeenCalledExactlyOnceWith({ address, action: "move", value: "Cherry" });
    expect(controller.read()).toContain('[c1/r1 move = "Cherry"; choices ["Oak","Birch"]]');
  } finally {
    spy.mockRestore();
    controller.dispose();
  }
});
