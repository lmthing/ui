import { useLayoutEffect, useRef, useState } from "react";
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
  const roundTwo = start.startsWith("round2_");
  const sources = useRef(new Map<string, string>());
  const nextFocus = useRef<{ address: string; heading: boolean } | undefined>(undefined);
  useLayoutEffect(() => {
    const target = nextFocus.current;
    if (!target) return;
    const { address, heading } = target;
    nextFocus.current = undefined;
    const selector = [address, `${address}/root`].map((part) => `[data-testid="${CSS.escape(part)}"]`);
    const node = document.querySelector<HTMLElement>(selector.join(","));
    if (!node) return;
    if (heading) node.tabIndex = -1;
    node.focus();
  }, [current]);
  const onLink = (goto: string, address: string) => {
    if (goto === "back" && stack.length > 1) {
      const source = sources.current.get(current);
      if (source) nextFocus.current = { address: source, heading: false };
    } else if (Object.hasOwn(navigationScreens, goto) && goto !== current) {
      sources.current.set(goto, address);
      if (roundTwo) nextFocus.current = { address: `${goto}/h1/title`, heading: true };
    }
    setStack((path) => {
      if (goto === "back") return path.length > 1 ? path.slice(0, -1) : path;
      if (!Object.hasOwn(navigationScreens, goto) || goto === path.at(-1)) return path;
      if (goto === "saved" && path.at(-1) === "log") return [...path.slice(0, -1), goto];
      return navigationRoots.includes(goto) ? [goto] : [...path, goto];
    });
  };
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
          key={roundTwo ? "round2" : current}
          screen={navigationScreens[current]!}
          theme={theme}
          onLink={onLink}
          {...(roundTwo ? { navigationMotion: "cut" as const } : { reduceMotion: true })}
        />
      </YStack>
    </TamaguiProvider>
  );
}
