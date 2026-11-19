import { defaultEnvironment, type Environment, type NativeHost } from "./environment";
import { useMemo, useRef, type ReactNode } from "react";
import { Theme, YStack, type TamaguiElement } from "tamagui";
import {
  defaultLang,
  kitStyleOf,
  localeOf,
  presets,
  themeName,
  themePreferencesOf,
  type ThemeChoice,
} from "../../catalog";
import { noopParts, type PartRegistry } from "../registry";
import { KitContext, type KitContextValue } from "./context";
import { useReducedMotion } from "./useReducedMotion";

type KitProviderProps = {
  children: ReactNode;
  theme: ThemeChoice;
  lang?: string | undefined;
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
  lang = defaultLang,
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
  const osReduced = useReducedMotion(theme.motion === "lively" && !environment.reduceMotion, nativeHost);
  const { density, motion } = themePreferencesOf(theme, environment.reduceMotion || osReduced);
  const value = useMemo(
    () => ({
      style: kitStyleOf(preset, density),
      density,
      motion,
      lang: localeOf(lang),
      parts,
      root,
      interactive,
      environment: osReduced ? { ...environment, reduceMotion: true } : environment,
      ...(nativeHost ? { nativeHost } : {}),
      ...(controller ? { controller } : {}),
      ...linkHandler(controller, onLink),
      ...(resolvePhoto ? { resolvePhoto } : {}),
    }),
    [
      preset,
      density,
      motion,
      lang,
      parts,
      interactive,
      environment,
      osReduced,
      nativeHost,
      controller,
      onLink,
      resolvePhoto,
    ],
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

function linkHandler(controller: KitContextValue["controller"], onLink: KitContextValue["onLink"]) {
  if (controller) return { onLink: (_goto: string, address: string) => void controller.press(address) };
  return onLink ? { onLink } : {};
}
