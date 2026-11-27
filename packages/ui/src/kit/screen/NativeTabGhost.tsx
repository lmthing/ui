import { memo, useMemo } from "react";
import { YStack } from "tamagui";
import { emptyDeviceData, type ScreenLike, type Values } from "../../catalog";
import { createInteractionStore, createScreenController, DeviceDataContext } from "../interact";
import { KitProvider, useKit } from "../provider";
import { Screen } from "./Screen";
import type { PhoneScreenProps } from "./PhoneScreen";

export type NativeTabShot = Pick<
  PhoneScreenProps,
  "defs" | "renderers" | "theme" | "lang" | "resolvePhoto" | "deviceData"
> & {
  screen: ScreenLike;
  values: Values;
  scrollTop: number;
};

/** The outgoing native layer is a frozen, unmounted controller with no host capabilities. */
export const NativeTabGhost = memo(function NativeTabGhost({ shot }: { shot: NativeTabShot }) {
  const { environment } = useKit();
  const controller = useMemo(
    () =>
      createScreenController({
        screen: shot.screen,
        defs: shot.defs,
        interactive: false,
        store: createInteractionStore(shot.values),
        deviceData: shot.deviceData,
      }),
    [shot],
  );
  return (
    <YStack
      fullscreen
      pointerEvents="none"
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <KitProvider
        theme={shot.theme}
        lang={shot.lang}
        {...(shot.resolvePhoto ? { resolvePhoto: shot.resolvePhoto } : {})}
        environment={{ ...environment, agentMode: true }}
        controller={controller}
      >
        <DeviceDataContext.Provider value={shot.deviceData ?? emptyDeviceData}>
          <Screen controller={controller} renderers={shot.renderers} initialBodyScroll={shot.scrollTop} />
        </DeviceDataContext.Provider>
      </KitProvider>
    </YStack>
  );
});
