import { useWords, useKit } from "../provider";
import { useCallback, useContext, type RefObject } from "react";
import { YStack } from "tamagui";
import { filterDeviceDataScreen, resolveDataViews, type Issue } from "../../catalog";
import { KitAction, KitSheet } from "../base";
import { PartScope } from "../part";
import { DeviceDataContext, type ScreenController } from "../interact";
import { RenderReportContext, useReport } from "../report";
import { ScreenContent, ScreenSheet, type BodyScrollHandle } from "./screen-parts";
import { filterVisibleContent } from "./visible-content";
import type { ScreenOverlay, ScreenReturnPoint } from "./screen-navigation";
import { ScreenLayers, type ScreenLayer } from "./ScreenLayers";
import type { ScreenLike } from "../../catalog";

export type RendererMap = Record<string, (props: never) => React.ReactNode>;
type ScreenProps = {
  controller: ScreenController;
  renderers: RendererMap;
  /** @deprecated Initial content now paints without an entrance on every screen. */
  navigationArrival?: boolean;
  initialBodyScroll?: number;
  restoration?: ScreenReturnPoint | undefined;
  scrollRef?: RefObject<BodyScrollHandle | null> | undefined;
  navigationOverlay?: ScreenOverlay | null | undefined;
  navigationSheet?: ScreenLike["components"][number] | undefined;
  onBodyScroll?: (top: number) => void;
  onReport?: ((issues: Issue[]) => void) | undefined;
};
export function Screen(props: ScreenProps) {
  const {
    controller,
    renderers,
    onReport,
    initialBodyScroll,
    restoration,
    scrollRef,
    navigationOverlay,
    navigationSheet,
    onBodyScroll,
  } = props;
  const components = controller.defs;
  const { environment, resolvePhoto, root } = useKit();
  const screen = viewScreen(controller, navigationSheet);
  const publish = useReport(screen, components, root, onReport);
  const data = useContext(DeviceDataContext) ?? controller.deviceData;
  const permitted = filterDeviceDataScreen(screen, components, data);
  const visible = filterVisibleContent(permitted, components, resolvePhoto);
  const layer = useLayer({
    controller,
    renderers,
    screen: visible,
    navigationOverlay,
  });
  if (!controller.admitted) return null;
  return (
    <RenderReportContext.Provider value={publish}>
      <YStack flex={1} position="relative" minHeight="100%" paddingBottom={environment.keyboardHeight}>
        <ScreenContent
          key={visible.id}
          {...(initialBodyScroll !== undefined ? { initialBodyScroll } : {})}
          restoration={restoration}
          scrollRef={scrollRef}
          {...(onBodyScroll ? { onBodyScroll } : {})}
          controller={controller}
          renderers={renderers}
          screen={visible}
          views={resolveDataViews(visible, components)}
          covered={Boolean(layer)}
        />
        <ScreenLayers layer={layer} />
      </YStack>
    </RenderReportContext.Provider>
  );
}

function viewScreen(controller: ScreenController, sheet: ScreenProps["navigationSheet"]) {
  const screen = controller.snapshotScreen();
  if (
    !sheet ||
    sheet.c !== "Sheet" ||
    controller.store.get(`${screen.id}/${sheet.id}/$dismissed`) ||
    screen.components.some(({ id }) => id === sheet.id)
  )
    return screen;
  // The local controller omits a closed Sheet from its snapshot; the script supplies only its view.
  return { ...screen, components: [...screen.components, sheet] };
}

function useLayer({
  screen,
  controller,
  renderers,
  navigationOverlay,
}: Pick<ScreenProps, "controller" | "renderers" | "navigationOverlay"> & {
  screen: ScreenLike;
}): ScreenLayer | undefined {
  const { cancelLabel, confirmLabel } = useWords().words;
  const data = useContext(DeviceDataContext) ?? controller.deviceData;
  const dismiss = useDismiss(controller);
  const confirmation = navigationOverlay === undefined ? controller.confirmationFor(data) : undefined;
  if (confirmation) {
    return {
      key: `${screen.id}:confirm`,
      kind: "modal",
      label: confirmation.message,
      dismiss,
      content: (
        <PartScope screen={screen.id} component="confirm" rev={1} state="filled">
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
      ),
    };
  }
  const id = navigationOverlay === undefined ? controller.openSheet : navigationOverlay?.id;
  const sheet = screen.components.find((entry) => entry.id === id && entry.c === "Sheet");
  if (!sheet) return;
  const kind = navigationOverlay?.kind ?? "sheet";
  return {
    key: `${screen.id}:${sheet.id}:${kind}`,
    kind,
    scripted: Boolean(navigationOverlay),
    label: String(sheet.title),
    dismiss,
    content: <ScreenSheet controller={controller} renderers={renderers} screen={screen} id={sheet.id} />,
  };
}

function useDismiss(controller: ScreenController) {
  return useCallback(() => {
    controller.act(
      controller.confirmation
        ? { address: "confirm/cancel", action: "dismiss" }
        : { address: `${controller.openSheet}/close`, action: "dismiss" },
    );
  }, [controller]);
}
