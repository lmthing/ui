import type { Environment, NativeHost } from "./environment";
import { createContext, type RefObject } from "react";
import type { TamaguiElement } from "tamagui";
import type { KitStyle } from "../../catalog";
import type { ScreenController } from "../interact/controller";
import type { PartRegistry } from "../registry";

export type KitContextValue = {
  style: KitStyle;
  parts: PartRegistry;
  root: RefObject<TamaguiElement | null>;
  interactive: boolean;
  environment: Environment;
  nativeHost?: NativeHost;
  controller?: ScreenController;
  onLink?: (goto: string, address: string) => void;
  resolvePhoto?: (ref: string) => string | undefined;
};
export const KitContext = createContext<KitContextValue | null>(null);
