import { useCallback } from "react";
import { ScrollView, YStack } from "tamagui";
import { cancelLabel, confirmLabel, space, stampItemIds } from "../../catalog";
import { KitAction, KitSheet } from "../base";
import { KitOverlay } from "../base/KitOverlay";
import { PartScope } from "../part";
import type { ScreenController } from "../interact/controller";

export type RendererMap = Record<string, (props: never) => React.ReactNode>;
export function Screen({ controller, renderers }: { controller: ScreenController; renderers: RendererMap }) {
  const components = controller.defs;
  const screen = controller.snapshotScreen();
  const confirmation = controller.confirmation;
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
      <PartScope key={id} screen={screen.id} component={id} rev={1} state={state}>
        <View {...props} />
      </PartScope>
    );
  };
  const region = (name: string) =>
    screen.components
      .filter((entry) => (components[entry.c as keyof typeof components]?.meta.region ?? "body") === name)
      .map(draw);
  return (
    <YStack flex={1} position="relative" minHeight="100%">
      <YStack flex={1} {...(sheet || confirmation ? { inert: true, "aria-hidden": true } : {})}>
        <YStack paddingHorizontal={space.gutter} paddingTop={space.lg} gap={space.md}>
          {region("top")}
        </YStack>
        <ScrollView flex={1} contentContainerStyle={{ padding: space.gutter, gap: space.lg }}>
          {region("body")}
        </ScrollView>
        <YStack paddingHorizontal={space.gutter} paddingBottom={space.lg} gap={space.md}>
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
