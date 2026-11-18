import { useCallback, useEffect } from "react";
import { YStack } from "tamagui";
import { cancelLabel, confirmLabel, checkScreen, type Issue } from "../../catalog";
import { KitAction, KitSheet, KitOverlay } from "../base";
import { useKit } from "../provider";
import { PartScope } from "../part";
import type { ScreenController } from "../interact";
import { ScreenContent, ScreenSheet } from "./screen-parts";

export type RendererMap = Record<string, (props: never) => React.ReactNode>;
type ScreenProps = {
  controller: ScreenController;
  renderers: RendererMap;
  onReport?: ((issues: Issue[]) => void) | undefined;
};
export function Screen({ controller, renderers, onReport }: ScreenProps) {
  const components = controller.defs;
  const { environment } = useKit();
  const screen = controller.snapshotScreen();
  const confirmation = controller.confirmation;
  const fingerprint = JSON.stringify(screen);
  useEffect(() => {
    const timer = setTimeout(() => onReport?.(checkScreen(screen, components)), 150);
    return () => clearTimeout(timer);
  }, [fingerprint, components, onReport]);
  const sheet = screen.components.find((entry) => entry.id === controller.openSheet);
  const dismiss = useCallback(() => {
    controller.act(
      controller.confirmation
        ? { address: "confirm/cancel", action: "dismiss" }
        : { address: `${controller.openSheet}/close`, action: "dismiss" },
    );
  }, [controller]);
  return (
    <YStack flex={1} position="relative" minHeight="100%" paddingBottom={environment.keyboardHeight}>
      <ScreenContent
        controller={controller}
        renderers={renderers}
        screen={screen}
        covered={Boolean(sheet || confirmation)}
      />
      {sheet && !confirmation && (
        <KitOverlay label={String(sheet.title)} onDismiss={dismiss}>
          <ScreenSheet controller={controller} renderers={renderers} screen={screen} />
        </KitOverlay>
      )}
      {confirmation && (
        <KitOverlay label={confirmation.message} onDismiss={dismiss}>
          <PartScope screen={screen.id} component="confirm" rev={1} state="filled">
            <KitSheet title={confirmation.message} closeLabel={cancelLabel}>
              <KitAction label={confirmLabel} kind={confirmation.kind} part="confirm" full />
              <KitAction label={cancelLabel} kind="quiet" part="cancel" action="dismiss" full />
            </KitSheet>
          </PartScope>
        </KitOverlay>
      )}
    </YStack>
  );
}
