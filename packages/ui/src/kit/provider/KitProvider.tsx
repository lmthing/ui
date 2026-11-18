import { useMemo, useRef, type ReactNode } from "react";
import { Theme, YStack, type TamaguiElement } from "tamagui";
import { kitStyleOf, presets, themeName, type ThemeChoice } from "../../catalog";
import { noopParts, type PartRegistry } from "../registry";
import { KitContext, type KitContextValue } from "./context";

type KitProviderProps = {
  children: ReactNode;
  theme: ThemeChoice;
  parts?: PartRegistry;
  interactive?: boolean;
  controller?: KitContextValue["controller"];
  onLink?: KitContextValue["onLink"];
  resolvePhoto?: KitContextValue["resolvePhoto"];
};
export function KitProvider({
  children,
  theme,
  parts = noopParts,
  interactive = false,
  controller,
  onLink,
  resolvePhoto,
}: KitProviderProps) {
  const root = useRef<TamaguiElement>(null);
  const preset = presets.find((value) => value.id === theme.preset)!;
  const value = useMemo(
    () => ({
      style: kitStyleOf(preset),
      parts,
      root,
      interactive,
      ...(controller ? { controller } : {}),
      ...(controller
        ? {
            onLink: (_goto: string, address: string) => {
              controller.press(address);
            },
          }
        : onLink
          ? { onLink }
          : {}),
      ...(resolvePhoto ? { resolvePhoto } : {}),
    }),
    [preset, parts, interactive, controller, onLink, resolvePhoto],
  );
  return (
    <Theme name={themeName(theme)}>
      <KitContext.Provider value={value}>
        <YStack ref={root} backgroundColor="$bg" {...(controller ? { height: "100%" as const } : {})}>
          {children}
        </YStack>
      </KitContext.Provider>
    </Theme>
  );
}
