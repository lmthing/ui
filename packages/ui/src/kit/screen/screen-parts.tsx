import { useContext } from "react";
import { ScrollView, YStack } from "tamagui";
import { KitMotion, KitPresence } from "../motion";
import { PartScope } from "../part";
import { useKit, useKitStyle } from "../provider";
import { DeviceDataContext, type ScreenController } from "../interact";
import {
  space,
  parseItemProps,
  regionOf,
  sortByRegion,
  gapBetween,
  projectAdjustments,
  isDeviceDataVisible,
  type ScreenLike,
} from "../../catalog";
import type { RendererMap } from "./Screen";
import { ScreenBottomOutlet, ScreenBottomSlots, ScreenBottomSource } from "./pinned-bottom";

type RenderProps = { controller: ScreenController; renderers: RendererMap; screen: ScreenLike };
function ScreenEntry({
  controller,
  renderers,
  screen,
  entry,
}: RenderProps & {
  entry: ScreenLike["components"][number];
}) {
  const { id, c, state = "filled", ...input } = entry;
  const def = controller.defs[c];
  const View = renderers[c] as ((props: object) => React.ReactNode) | undefined;
  const data = useContext(DeviceDataContext) ?? controller.deviceData;
  // Presence can keep an old entry for its exit animation; a closed gate never keeps the view.
  if (!def || !View || !isDeviceDataVisible(def.meta, data)) return null;
  const parsed = parseItemProps(def, input);
  const props = projectAdjustments(def.meta, parsed, (part) =>
    controller.store.get(`${screen.id}/${id}/${part}`),
  );
  const signature = def.meta.signatureByStyle?.[String(input.style)] ?? def.meta.signature;
  return (
    <PartScope
      key={id}
      screen={screen.id}
      component={id}
      rev={1}
      state={state}
      {...(signature ? { signature } : {})}
      cue={Number(controller.store.get(`${screen.id}/${id}/$cue`) ?? 0)}
    >
      <View {...props} />
    </PartScope>
  );
}
function ScreenRegion({ name, ...props }: RenderProps & { name: string }) {
  const { controller, screen } = props;
  const components = controller.defs;
  const entries = sortByRegion(screen.components, components).filter(
    (entry) => regionOf(entry, components) === name,
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
            <ScreenEntry {...props} entry={entry} />
          </YStack>
        </KitMotion>
      ))}
    </KitPresence>
  );
}
export function ScreenContent({ covered, ...props }: RenderProps & { covered: boolean }) {
  const { environment } = useKit();
  const gutter = space[useKitStyle().frame.gutter];
  const { insets, keyboardHeight } = environment;
  const horizontal = {
    paddingLeft: Math.max(gutter, insets.left),
    paddingRight: Math.max(gutter, insets.right),
  };
  const bodyOrder = props.screen.components
    .filter((entry) => regionOf(entry, props.controller.defs) === "body")
    .map(({ id }) => id);
  return (
    <ScreenBottomSlots>
      <YStack flex={1} {...(covered ? { inert: true, "aria-hidden": true } : {})}>
        <YStack flexShrink={0} {...horizontal} paddingTop={Math.max(space.lg, insets.top)} gap={space.md}>
          <ScreenRegion {...props} name="top" />
        </YStack>
        <ScrollView
          flex={1}
          minHeight={0}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingVertical: space.gutter, ...horizontal }}
        >
          <ScreenBottomSource>
            <ScreenRegion {...props} name="body" />
          </ScreenBottomSource>
        </ScrollView>
        <YStack
          flexShrink={0}
          {...horizontal}
          paddingBottom={Math.max(space.lg, keyboardHeight ? 0 : insets.bottom)}
          gap={space.md}
        >
          <ScreenBottomOutlet screen={props.screen.id} order={bodyOrder} />
          <ScreenRegion {...props} name="bottom" />
        </YStack>
      </YStack>
    </ScreenBottomSlots>
  );
}
export function ScreenSheet({ controller, renderers, screen }: RenderProps) {
  const entry = screen.components.find((item) => item.id === controller.openSheet);
  return entry ? (
    <ScreenEntry controller={controller} renderers={renderers} screen={screen} entry={entry} />
  ) : null;
}
