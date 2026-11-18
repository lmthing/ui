import { KitMotion, KitPresence } from "../motion";
import { useCallback, useEffect } from "react";
import { ScrollView, YStack } from "tamagui";
import {
  cancelLabel,
  confirmLabel,
  space,
  stampItemIds,
  checkScreen,
  sortByRegion,
  gapBetween,
  type Issue,
} from "../../catalog";
import { KitAction, KitSheet, KitOverlay } from "../base";
import { useKit } from "../provider";
import { PartScope } from "../part";
import type { ScreenController } from "../interact";

export type RendererMap = Record<string, (props: never) => React.ReactNode>;
export function Screen({
  controller,
  renderers,
  onReport,
}: {
  controller: ScreenController;
  renderers: RendererMap;
  onReport?: ((issues: Issue[]) => void) | undefined;
}) {
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
  const draw = (entry: (typeof screen.components)[number]) => {
    const { id, c, state = "filled", ...input } = entry;
    const def = components[c as keyof typeof components];
    const View = renderers[c as keyof typeof renderers] as ((props: object) => React.ReactNode) | undefined;
    if (!def || !View) return null;
    const props = stampItemIds(def.meta, def.props.parse(input) as Record<string, unknown>);
    return (
      <PartScope
        key={id}
        screen={screen.id}
        component={id}
        rev={1}
        state={state}
        {...((def.meta.signatureByStyle?.[String(input.style)] ?? def.meta.signature)
          ? { signature: def.meta.signatureByStyle?.[String(input.style)] ?? def.meta.signature }
          : {})}
        cue={Number(controller.store.get(`${screen.id}/${id}/$cue`) ?? 0)}
      >
        <View {...props} />
      </PartScope>
    );
  };
  const region = (name: string) => {
    const entries = sortByRegion(screen.components, components).filter(
      (entry) => (components[entry.c]?.meta.region ?? "body") === name,
    );
    return (
      <KitPresence>
        {entries.map((entry, index) => (
          <KitMotion key={entry.id} index={index} cue={entry.state ?? "filled"}>
            <YStack
              marginTop={
                name === "body" && components[entry.c]
                  ? gapBetween(
                      index ? components[entries[index - 1]!.c]?.meta : undefined,
                      components[entry.c]!.meta,
                    )
                  : 0
              }
            >
              {draw(entry)}
            </YStack>
          </KitMotion>
        ))}
      </KitPresence>
    );
  };
  return (
    <YStack flex={1} position="relative" minHeight="100%" paddingBottom={environment.keyboardHeight}>
      <YStack flex={1} {...(sheet || confirmation ? { inert: true, "aria-hidden": true } : {})}>
        <YStack
          paddingLeft={Math.max(space.gutter, environment.insets.left)}
          paddingRight={Math.max(space.gutter, environment.insets.right)}
          paddingTop={Math.max(space.lg, environment.insets.top)}
          gap={space.md}
        >
          {region("top")}
        </YStack>
        <ScrollView
          flex={1}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ padding: space.gutter }}
        >
          {region("body")}
        </ScrollView>
        <YStack
          paddingHorizontal={space.gutter}
          paddingBottom={Math.max(space.lg, environment.keyboardHeight ? 0 : environment.insets.bottom)}
          gap={space.md}
        >
          {region("bottom")}
        </YStack>
      </YStack>
      {sheet && !confirmation && (
        <KitOverlay label={String(sheet.title)} onDismiss={dismiss}>
          {draw(sheet)}
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
