import { isValidElement, useContext } from "react";
import { ScrollView, YStack } from "tamagui";
import { KitMotion, KitPresence } from "../motion";
import { PartScope } from "../part";
import { useKit, useKitStyle } from "../provider";
import { DeviceDataContext, type ScreenController } from "../interact";
import { KitCard, KitEmpty } from "../base";
import {
  space,
  parseItemProps,
  regionOf,
  sortByRegion,
  gapBetween,
  projectAdjustments,
  isDeviceDataVisible,
  projectDataViewList,
  type resolveDataViews,
  type ScreenLike,
} from "../../catalog";
import type { RendererMap } from "./Screen";
import { ScreenBottomOutlet, ScreenBottomSlots, ScreenBottomSource } from "./pinned-bottom";

type RenderProps = {
  controller: ScreenController;
  renderers: RendererMap;
  screen: ScreenLike;
  views?: ReturnType<typeof resolveDataViews>;
};
function ScreenEntry({
  controller,
  renderers,
  screen,
  entry,
  views,
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
  const live = projectAdjustments(def.meta, parsed, (part) =>
    controller.store.get(`${screen.id}/${id}/${part}`),
  );
  const { props, empty } =
    views && state === "filled" ? projectDataViewList(views, id, live) : { props: live };
  const emptyPanel = views?.empty.get(id);
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
      {empty ? (
        <KitCard style="inset">
          <KitEmpty part="results" title={empty} prominence="body" announce="status" decorativeIcon />
        </KitCard>
      ) : (
        <View {...props} />
      )}
      {emptyPanel && (
        <KitEmpty part="results" title={emptyPanel} prominence="body" announce="status" decorativeIcon />
      )}
    </PartScope>
  );
}
function ScreenRegion({ name, ...props }: RenderProps & { name: string }) {
  const { controller, screen, views } = props;
  const components = controller.defs;
  const elsewhere = new Set(
    screen.components.filter((entry) => regionOf(entry, components) !== name).map(({ id }) => id),
  );
  const entries = sortByRegion(screen.components, components).filter(
    (entry) => regionOf(entry, components) === name && !views?.hidden.has(entry.id),
  );
  return (
    <KitPresence
      keepExit={(node) =>
        isValidElement<RegionEntryProps>(node) &&
        !elsewhere.has(node.props.entry.id) &&
        !views?.hidden.has(node.props.entry.id)
      }
    >
      {entries.map((entry, index) => (
        <RegionEntry
          key={entry.id}
          {...props}
          entry={entry}
          index={index}
          marginTop={
            name === "body" && components[entry.c]
              ? gapBetween(components[entries[index - 1]?.c ?? ""]?.meta, components[entry.c]!.meta)
              : 0
          }
        />
      ))}
    </KitPresence>
  );
}

type RegionEntryProps = RenderProps & {
  entry: ScreenLike["components"][number];
  index: number;
  marginTop: number;
  exiting?: boolean;
};
function RegionEntry({ index, marginTop, exiting, ...props }: RegionEntryProps) {
  return (
    <KitMotion index={index} cue={props.entry.state ?? "filled"} exiting={exiting ?? false}>
      <YStack marginTop={marginTop}>
        <ScreenEntry {...props} />
      </YStack>
    </KitMotion>
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
  const defs = props.controller.defs;
  const bodyOrder = props.screen.components
    .filter((entry) => regionOf(entry, defs) === "body")
    .map(({ id }) => id);
  const hasFooter = props.screen.components.some((entry) => regionOf(entry, defs) === "bottom");
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
          paddingTop={hasFooter ? space.md : 0}
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
