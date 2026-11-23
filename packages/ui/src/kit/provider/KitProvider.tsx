import { defaultEnvironment, type Environment, type NativeHost } from "./environment";
import { useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Theme, YStack, type TamaguiElement } from "tamagui";
import {
  component,
  defaultLang,
  kitStyleOf,
  localeOf,
  presets,
  space,
  themeName,
  themePreferencesOf,
  type ThemeChoice,
  type KitStyle,
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
  const desired = useMemo(() => kitStyleOf(preset, density), [preset, density]);
  const [style, onLayout] = useScreenGutter(desired);
  const value = useMemo(
    () => ({
      style,
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
      style,
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
        <YStack ref={root} onLayout={onLayout} backgroundColor="$bg" height={controller ? "100%" : undefined}>
          {children}
        </YStack>
      </KitContext.Provider>
    </Theme>
  );
}

function useScreenGutter(desired: KitStyle) {
  const gutter = desired.frame.gutter;
  const [wide, setWide] = useState(false);
  // A seven-day row must keep its full touch targets when the frame starts narrow or is resized.
  const minWidth = component.base.dayMinWidth * 7 + 2 * space[gutter];
  const onLayout: ComponentProps<typeof YStack>["onLayout"] =
    gutter === "gutter" ? undefined : ({ nativeEvent }) => setWide(nativeEvent.layout.width >= minWidth);
  const style = useMemo(
    () =>
      wide || gutter === "gutter"
        ? desired
        : { ...desired, frame: { ...desired.frame, gutter: "gutter" as const } },
    [desired, gutter, wide],
  );
  return [style, onLayout] as const;
}

function linkHandler(controller: KitContextValue["controller"], onLink: KitContextValue["onLink"]) {
  if (controller) return { onLink: (_goto: string, address: string) => void controller.press(address) };
  return onLink ? { onLink } : {};
}
