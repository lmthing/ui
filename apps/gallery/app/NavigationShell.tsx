import { useState } from "react";
import { TamaguiProvider, YStack } from "tamagui";
import { themeName, type ThemeChoice } from "@lmthing/ui/catalog";
import { PhoneScreen } from "@lmthing/ui/kit";
import { navigationRoots, navigationScreens, navigationStart } from "../fixtures/navigation-shell";
import { config } from "../index";

const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const phoneWidth = 390;

export function NavigationShell({ start }: { start: string }) {
  const [stack, setStack] = useState(() => navigationStart(start));
  const current = stack.at(-1)!;
  const onLink = (goto: string) =>
    setStack((path) => {
      if (goto === "back") return path.length > 1 ? path.slice(0, -1) : path;
      if (!Object.hasOwn(navigationScreens, goto) || goto === path.at(-1)) return path;
      if (goto === "saved" && path.at(-1) === "log") return [...path.slice(0, -1), goto];
      return navigationRoots.includes(goto) ? [goto] : [...path, goto];
    });
  return (
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <YStack
        width="100%"
        maxWidth={phoneWidth}
        height="100vh"
        alignSelf="center"
        data-navigation-shell={current}
      >
        <PhoneScreen
          key={current}
          screen={navigationScreens[current]!}
          theme={theme}
          onLink={onLink}
          {...(!start.startsWith("round2_") && { reduceMotion: true })}
        />
      </YStack>
    </TamaguiProvider>
  );
}
