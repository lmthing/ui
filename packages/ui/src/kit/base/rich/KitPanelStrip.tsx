import { useLayoutEffect, useState, type ReactNode } from "react";
import { isWeb, YStack } from "tamagui";
import { component, formatAddress } from "../../../catalog";
import { PartContext, usePart, usePartContext, usePartDisabled } from "../../part";
import { useKit, useWords } from "../../provider";
import { PanelPage, PanelViewport } from "./panel-viewport";
import { RichEmpty, safeRatio, type Drawing, type Target } from "./rich-drawing";

type Panel = { id: string; ratio: number; content: ReactNode };
type PanelProps = Drawing & {
  mode: "strip" | "ltr" | "rtl";
  panels: readonly Panel[];
  current?: number;
  target?: Target;
};
const placeholder: Panel = { id: "placeholder", ratio: component.base.tallRatio, content: null };

function panelGeometry(panels: readonly Panel[], width: number, strip: boolean) {
  let total = 0,
    tallest = 0;
  const offsets: number[] = [];
  const heights = panels.map(({ ratio }, index) => {
    const height = width / safeRatio(ratio);
    offsets.push(strip ? total : index * width);
    total += height;
    tallest = Math.max(tallest, height);
    return height;
  });
  return {
    heights,
    offsets,
    total,
    height: Math.min(strip ? total : tallest, width / component.base.tallRatio),
  };
}

function useHudTarget(target?: Target) {
  const { interactive, controller } = useKit();
  const address = usePart(target?.part, !!target);
  const { panelLabels } = useWords().words;
  const blocked = usePartDisabled(target ? address.testID : undefined);
  const enabled =
    !!target && !blocked && interactive && !!controller?.actionsAt(address.testID).includes("toggle");
  const toggle = () => controller?.act({ address: address.testID, action: "toggle" });
  return {
    surface: enabled
      ? {
          onPress: (event: { target: unknown }) => {
            if (
              isWeb &&
              (event.target as HTMLElement)?.closest?.("button, a, input, [role=button], [role=link]")
            )
              return;
            if (isWeb && document.getSelection()?.toString()) return;
            toggle();
          },
        }
      : {},
    control: target
      ? {
          ...address,
          accessibilityRole: "button" as const,
          accessibilityLabel: panelLabels.controls,
          "aria-disabled": !enabled || undefined,
          ...(isWeb
            ? {
                tabIndex: enabled ? 0 : -1,
                ...(enabled
                  ? {
                      onPress: toggle,
                      ...({
                        onKeyDown(event: Pick<KeyboardEvent, "key" | "repeat" | "preventDefault">) {
                          if (event.key !== "Enter" && event.key !== " ") return;
                          event.preventDefault();
                          if (!event.repeat) toggle();
                        },
                      } as object),
                    }
                  : {}),
              }
            : { accessible: true, onAccessibilityTap: enabled ? toggle : undefined }),
        }
      : undefined,
  };
}

function PanelReader({
  panels,
  mode,
  current = 0,
  width,
  loading,
  target,
}: PanelProps & { width: number; loading: boolean }) {
  const strip = mode === "strip";
  const context = usePartContext();
  const hud = useHudTarget(target);
  const { heights, ...geometry } = panelGeometry(panels, width, strip);
  const visible = Math.max(
    0,
    Math.min(panels.length - 1, Number.isFinite(current) ? Math.trunc(current) : 0),
  );
  const ordered = panels.map((panel, index) => ({ panel, index }));
  if (!isWeb && mode === "rtl") ordered.reverse();
  return (
    <YStack {...hud.surface}>
      {hud.control && <YStack {...hud.control} fullscreen pointerEvents="none" />}
      <PanelViewport {...geometry} {...{ mode, width, loading }} current={visible}>
        {(active) => (
          <YStack
            flexDirection={strip ? "column" : "row"}
            accessibilityRole={loading ? undefined : "list"}
            aria-hidden={loading || undefined}
            accessibilityElementsHidden={loading}
          >
            {ordered.map(({ panel, index }) => (
              <PanelPage
                key={panel.id}
                {...{ width, strip, loading }}
                height={heights[index]!}
                viewHeight={geometry.height}
                active={active === index}
              >
                <PartContext.Provider value={{ ...context, item: panel.id }}>
                  {panel.content}
                </PartContext.Provider>
              </PanelPage>
            ))}
          </YStack>
        )}
      </PanelViewport>
    </YStack>
  );
}

/** Reader geometry and input only; the caller owns the HUD and any augmented panel content. */
export function KitPanelStrip({ part = "root", loading, mode, panels, current, target }: PanelProps) {
  const context = usePartContext();
  const { controller } = useKit();
  const [width, setWidth] = useState(0);
  const busy = !!loading || context.state === "loading";
  const empty = !busy && (context.state === "empty" || !panels.length);
  const shown = busy && !panels.length ? [placeholder] : panels;
  const sharedPart =
    !busy && !empty && target?.part === part && (target.item ?? context.item) === context.item;
  const address = usePart(part, !sharedPart);
  const hiddenAddress =
    target && (busy || empty)
      ? formatAddress({ ...context, ...(target.item ? { item: target.item } : {}), part: target.part })
      : undefined;
  useLayoutEffect(
    () => (hiddenAddress ? controller?.registerDisabledPart(hiddenAddress) : undefined),
    [controller, hiddenAddress],
  );
  return (
    <YStack
      {...(!sharedPart ? address : {})}
      width="100%"
      minWidth={component.base.none}
      aria-busy={busy || undefined}
      onLayout={(event) => {
        address.onLayout();
        setWidth(Math.round(event.nativeEvent.layout.width));
      }}
    >
      {empty ? (
        <RichEmpty />
      ) : (
        width > 0 && (
          <PartContext.Provider value={target?.item ? { ...context, item: target.item } : context}>
            <PanelReader
              {...{ mode, width }}
              panels={shown}
              loading={busy}
              {...(current === undefined ? {} : { current })}
              {...(!busy && target ? { target } : {})}
            />
          </PartContext.Provider>
        )
      )}
    </YStack>
  );
}
