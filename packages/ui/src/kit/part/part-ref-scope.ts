import { createContext, type RefObject } from "react";
import type { TamaguiElement } from "tamagui";

export const PartRefScope = createContext<
  ((address: string, ref: RefObject<TamaguiElement | null>) => () => void) | null
>(null);
