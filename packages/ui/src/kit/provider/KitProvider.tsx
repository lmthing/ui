import { defaultEnvironment, type Environment, type NativeHost } from "./environment";
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
  environment?: Environment;
  nativeHost?: NativeHost;
  controller?: KitContextValue["controller"];
  onLink?: KitContextValue["onLink"];
  resolvePhoto?: KitContextValue["resolvePhoto"];
};
export function KitProvider({
  children,
  theme,
  parts = noopParts,
  interactive = false,
  environment = defaultEnvironment,
  nativeHost,
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
      environment,
      ...(nativeHost ? { nativeHost } : {}),
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
    [preset, parts, interactive, environment, nativeHost, controller, onLink, resolvePhoto],
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
