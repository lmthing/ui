import { TamaguiProvider, Text, XStack, YStack } from "tamagui";
import { presets, space, themeName, type ScreenLike, type ThemeChoice } from "@lmthing/ui/catalog";
import { PhoneScreen } from "@lmthing/ui/kit";
import { config } from "../index";
import { themeReferenceScreens } from "./theme-reference-screens";

const width = 390;
const height = 576;

function ReferencePhone({ screen, theme }: { screen: ScreenLike; theme: ThemeChoice }) {
  return (
    <YStack
      width={width}
      height={height}
      data-reference-phone={screen.id}
      data-look-frame={`${theme.preset}/${screen.id}`}
    >
      <PhoneScreen screen={screen} theme={theme} reduceMotion />
    </YStack>
  );
}

export function ThemeReference({ mode, screenId }: { mode: "light" | "dark"; screenId: string | null }) {
  const screens = screenId
    ? themeReferenceScreens.filter((screen) => screen.id === screenId)
    : themeReferenceScreens;
  return (
    <TamaguiProvider config={config} defaultTheme={themeName({ preset: "calm", mode, accent: "moss" })}>
      <YStack padding={space.lg} gap={space.sm} backgroundColor="$bg" data-theme-reference={mode}>
        <Text color="$text" fontSize={24} fontWeight="700">
          {`Theme reference · ${mode}`}
        </Text>
        <Text color="$muted" fontSize={16}>
          {screenId ? `${screenId} · Moss accent` : "List / Dashboard / Form · Moss accent"}
        </Text>
        <XStack
          flexWrap="wrap"
          gap={space.lg}
          width={screenId ? 4 * width + 3 * space.lg : undefined}
          style={screenId ? undefined : { zoom: 0.36 }}
        >
          {presets.map(({ id }) => (
            <YStack key={id} data-reference-preset={id} gap={space.sm}>
              <Text color="$text" fontSize={screenId ? 18 : 42} fontWeight="700">
                {id}
              </Text>
              <XStack gap={space.sm}>
                {screens.map((screen) => (
                  <ReferencePhone
                    key={screen.id}
                    screen={screen}
                    theme={{ preset: id, mode, accent: "moss" }}
                  />
                ))}
              </XStack>
            </YStack>
          ))}
        </XStack>
      </YStack>
    </TamaguiProvider>
  );
}
