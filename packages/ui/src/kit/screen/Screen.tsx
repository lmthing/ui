import { useWords, useKit } from "../provider";
import { useCallback, useContext } from "react";
import { YStack } from "tamagui";
import { filterDeviceDataScreen, resolveDataViews, type Issue } from "../../catalog";
import { KitAction, KitSheet, KitOverlay } from "../base";
import { PartScope } from "../part";
import { DeviceDataContext, type ScreenController } from "../interact";
import { RenderReportContext, useReport } from "../report";
import { ScreenContent, ScreenSheet } from "./screen-parts";
import { filterVisibleContent } from "./visible-content";

export type RendererMap = Record<string, (props: never) => React.ReactNode>;
type ScreenProps = {
  controller: ScreenController;
  renderers: RendererMap;
  navigationArrival?: boolean;
  initialBodyScroll?: number;
  onBodyScroll?: (top: number) => void;
  onReport?: ((issues: Issue[]) => void) | undefined;
};
export function Screen({
  controller,
  renderers,
  onReport,
  navigationArrival,
  initialBodyScroll,
  onBodyScroll,
}: ScreenProps) {
  const components = controller.defs;
  const { environment, resolvePhoto, root } = useKit();
  const screen = controller.snapshotScreen();
  const publish = useReport(screen, components, root, onReport);
  const data = useContext(DeviceDataContext) ?? controller.deviceData;
  const confirmation = controller.confirmationFor(data);
  const permitted = filterDeviceDataScreen(screen, components, data);
  const visible = filterVisibleContent(permitted, components, resolvePhoto);
  const sheet = visible.components.find((entry) => entry.id === controller.openSheet);
  const dismiss = useCallback(() => {
    controller.act(
      controller.confirmation
        ? { address: "confirm/cancel", action: "dismiss" }
        : { address: `${controller.openSheet}/close`, action: "dismiss" },
    );
  }, [controller]);
  if (!controller.admitted) return null;
  return (
    <RenderReportContext.Provider value={publish}>
      <YStack flex={1} position="relative" minHeight="100%" paddingBottom={environment.keyboardHeight}>
        <ScreenContent
          key={visible.id}
          {...(navigationArrival ? { navigationArrival } : {})}
          {...(initialBodyScroll !== undefined ? { initialBodyScroll } : {})}
          {...(onBodyScroll ? { onBodyScroll } : {})}
          controller={controller}
          renderers={renderers}
          screen={visible}
          views={resolveDataViews(visible, components)}
          covered={Boolean(sheet || confirmation)}
        />
        {sheet && !confirmation && (
          <KitOverlay label={String(sheet.title)} onDismiss={dismiss}>
            <ScreenSheet controller={controller} renderers={renderers} screen={visible} />
          </KitOverlay>
        )}
        {confirmation && <ScreenConfirmation {...{ confirmation, dismiss }} id={screen.id} />}
      </YStack>
    </RenderReportContext.Provider>
  );
}

function ScreenConfirmation({
  confirmation,
  dismiss,
  id,
}: {
  confirmation: NonNullable<ReturnType<ScreenController["confirmationFor"]>>;
  dismiss: () => void;
  id: string;
}) {
  const { cancelLabel, confirmLabel } = useWords().words;
  return (
    <KitOverlay label={confirmation.message} onDismiss={dismiss}>
      <PartScope screen={id} component="confirm" rev={1} state="filled">
        <KitSheet title={confirmation.message} closeLabel={cancelLabel}>
          <KitAction
            label={confirmation.label ?? confirmLabel}
            kind={confirmation.kind}
            part="confirm"
            full
          />
          <KitAction label={cancelLabel} kind="quiet" part="cancel" action="dismiss" full />
        </KitSheet>
      </PartScope>
    </KitOverlay>
  );
}
