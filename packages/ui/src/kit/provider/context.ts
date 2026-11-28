import type { Environment, NativeHost } from "./environment";
import { createContext, type RefObject } from "react";
import type { TamaguiElement } from "tamagui";
import type { ImageResolver, KitStyle, ThemeDensity, ThemeMotion } from "../../catalog";
import type { ScreenController } from "../interact";
import type { PartRegistry } from "../registry";

export type KitContextValue = {
  style: KitStyle;
  density: ThemeDensity;
  motion: ThemeMotion;
  lang: string;
  parts: PartRegistry;
  root: RefObject<TamaguiElement | null>;
  interactive: boolean;
  visualOnly?: true;
  environment: Environment;
  nativeHost?: NativeHost;
  controller?: ScreenController;
  onLink?: (goto: string, address: string) => void;
  resolvePhoto?: (ref: string) => string | undefined;
  resolveImage?: ImageResolver | undefined;
};
export const KitContext = createContext<KitContextValue | null>(null);
