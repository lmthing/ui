import {
  isValidElement,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type RefObject,
} from "react";
import { isWeb, ScrollView, YStack } from "tamagui";
import { KitMotion, KitRecordArrival, ListProjectionKey, usePresence } from "../motion";
import { PartScope } from "../part";
import { useKit, useKitStyle } from "../provider";
import { DeviceDataContext, type ScreenController } from "../interact";
import { KitCard, KitEmpty } from "../base";
import {
  space,
  motion,
  parseItemProps,
  regionOf,
  sortByRegion,
  gapBetween,
  projectAdjustments,
  isDeviceDataVisible,
  projectDataViewList,
  signatures,
  type resolveDataViews,
  type ScreenLike,
} from "../../catalog";
import type { RendererMap } from "./Screen";
import type { ScreenReturnPoint } from "./screen-navigation";
import { ScreenBottomOutlet, ScreenBottomSlots, ScreenBottomSource } from "./pinned-bottom";

type RenderProps = {
  controller: ScreenController;
  renderers: RendererMap;
  screen: ScreenLike;
  views?: ReturnType<typeof resolveDataViews>;
  compactTitle?: boolean;
};
function listProjection(views: RenderProps["views"], id: string) {
  return JSON.stringify(
    views?.lists.get(id)?.map(({ filter, active }) => [filter.field, active.map(({ match }) => match)]),
  );
}

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
  const { props, empty } = views ? projectDataViewList(views, id, live, state) : { props: live };
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
        <ListProjectionKey.Provider value={listProjection(views, id)}>
          {c === signatures.record_arrive.component && state === "filled" ? (
            <KitRecordArrival receipt={props}>
              <View {...props} />
            </KitRecordArrival>
          ) : (
            <View {...props} />
          )}
        </ListProjectionKey.Provider>
      )}
      {emptyPanel && (
        <KitEmpty part="results" title={emptyPanel} prominence="body" announce="status" decorativeIcon />
      )}
    </PartScope>
  );
}
function ScreenRegion({
  name,
  scroll,
  initialScroll,
  restoration,
  scrollRef,
  ...props
}: RenderProps & {
  name: string;
  scroll?: Omit<ComponentProps<typeof ScrollView>, "children">;
  initialScroll?: number | undefined;
  restoration?: ScreenReturnPoint | undefined;
  scrollRef?: RefObject<BodyScrollHandle | null> | undefined;
}) {
  const { controller, screen, views, compactTitle } = props;
  const components = controller.defs;
  const elsewhere = new Set(
    screen.components.filter((entry) => regionOf(entry, components) !== name).map(({ id }) => id),
  );
  const entries = sortByRegion(screen.components, components).filter(
    (entry) => regionOf(entry, components) === name && !views?.hidden.has(entry.id),
  );
  const initial = useRef(new Set(entries.map(({ id }) => id)));
  const rows = entries.map((entry, index) => (
    <RegionEntry
      key={entry.id}
      {...props}
      entry={
        compactTitle && name === "top" && entry.c === "Header" && entry.style !== "back"
          ? { ...entry, emphasis: "quiet", sub: undefined }
          : entry
      }
      sticky={name === "body" && entry.c === "SectionTitle"}
      appear={!initial.current.has(entry.id)}
      index={index}
      marginTop={
        name === "body" && components[entry.c]
          ? gapBetween(components[entries[index - 1]?.c ?? ""]?.meta, components[entry.c]!.meta)
          : 0
      }
    />
  ));
  const keepExit = (node: React.ReactNode) =>
    isValidElement<RegionEntryProps>(node) &&
    !elsewhere.has(node.props.entry.id) &&
    !views?.hidden.has(node.props.entry.id);
  const present = usePresence(rows, keepExit);
  if (!scroll) return <>{present}</>;
  return (
    <ScreenBottomSource>
      <ScreenBodyScroll
        {...scroll}
        stickyHeaderIndices={visibleStickyIndices(present)}
        {...{ initialScroll, restoration, scrollRef }}
      >
        {present}
      </ScreenBodyScroll>
    </ScreenBottomSource>
  );
}

function visibleStickyIndices(present: React.ReactNode[]) {
  return present.flatMap((node, index) =>
    isValidElement<RegionEntryProps>(node) && node.props.sticky && !node.props.exiting ? [index] : [],
  );
}

export type BodyScrollHandle = {
  scrollTo(options: { x: number; y: number; animated: boolean }): void;
  getScrollableNode?(): HTMLElement;
};

function ScreenBodyScroll({
  initialScroll,
  restoration,
  scrollRef,
  ...props
}: ComponentProps<typeof ScrollView> & {
  initialScroll?: number | undefined;
  restoration?: ScreenReturnPoint | undefined;
  scrollRef?: RefObject<BodyScrollHandle | null> | undefined;
}) {
  const local = useRef<BodyScrollHandle>(null);
  const ref = scrollRef ?? local;
  const initial = useRef(initialScroll);
  useLayoutEffect(() => {
    // React Native Web does not consume contentOffset.
    if (isWeb && initial.current) ref.current?.scrollTo({ x: 0, y: initial.current, animated: false });
  }, []);
  useLayoutEffect(() => {
    if (restoration) ref.current?.scrollTo({ x: 0, y: restoration.scrollTop, animated: false });
  }, [restoration]);
  return (
    <ScrollView
      {...props}
      ref={ref as never}
      scrollEventThrottle={motion.scrollSampleMs}
      {...(!isWeb && initial.current ? { contentOffset: { x: 0, y: initial.current } } : {})}
    />
  );
}

type RegionEntryProps = RenderProps & {
  entry: ScreenLike["components"][number];
  index: number;
  marginTop: number;
  exiting?: boolean;
  sticky?: boolean;
  appear?: boolean;
};
function RegionEntry({ index, marginTop, exiting, sticky, appear = true, ...props }: RegionEntryProps) {
  return (
    <KitMotion index={index} cue={props.entry.state ?? "filled"} exiting={exiting ?? false} appear={appear}>
      <YStack {...(sticky ? { paddingTop: marginTop, backgroundColor: "$bg" } : { marginTop })}>
        <ScreenEntry {...props} />
      </YStack>
    </KitMotion>
  );
}
const coveredProps = {
  "aria-hidden": true,
  pointerEvents: "none",
  ...(isWeb
    ? { inert: true }
    : { accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" as const }),
} as const;

export function ScreenContent({
  covered,
  initialBodyScroll,
  restoration,
  scrollRef,
  onBodyScroll,
  ...props
}: RenderProps & BodyOptions) {
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
  const { compactTitle, onScroll } = useCompactTitle(initialBodyScroll, restoration, onBodyScroll);
  return (
    <ScreenBottomSlots>
      <YStack flex={1} {...(covered ? coveredProps : {})}>
        <YStack flexShrink={0} {...horizontal} paddingTop={Math.max(space.lg, insets.top)} gap={space.md}>
          <ScreenRegion {...props} name="top" compactTitle={compactTitle} />
        </YStack>
        <ScreenRegion
          {...props}
          name="body"
          {...{ initialScroll: initialBodyScroll, restoration, scrollRef }}
          scroll={{
            flex: 1,
            minHeight: 0,
            keyboardShouldPersistTaps: "handled",
            keyboardDismissMode: "on-drag",
            onScroll,
            contentContainerStyle: { paddingVertical: space.gutter, ...horizontal },
          }}
        />
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
function useCompactTitle(
  initial: number | undefined,
  restoration: ScreenReturnPoint | undefined,
  onBodyScroll: BodyOptions["onBodyScroll"],
) {
  const [compactTitle, setCompactTitle] = useState(
    (restoration?.scrollTop ?? initial ?? 0) >= motion.collapseTitleAt,
  );
  useLayoutEffect(() => {
    if (restoration) setCompactTitle(restoration.scrollTop >= motion.collapseTitleAt);
  }, [restoration]);
  const onScroll: NonNullable<ComponentProps<typeof ScrollView>["onScroll"]> = ({ nativeEvent }) => {
    const top = nativeEvent.contentOffset.y;
    onBodyScroll?.(top);
    if (top >= motion.collapseTitleAt) setCompactTitle(true);
    else if (top <= motion.expandTitleAt) setCompactTitle(false);
  };
  return { compactTitle, onScroll };
}

type BodyOptions = {
  covered: boolean;
  initialBodyScroll?: number;
  restoration?: ScreenReturnPoint | undefined;
  scrollRef?: RefObject<BodyScrollHandle | null> | undefined;
  onBodyScroll?: (top: number) => void;
};
export function ScreenSheet({ controller, renderers, screen }: RenderProps) {
  const entry = screen.components.find((item) => item.id === controller.openSheet);
  return entry ? (
    <ScreenEntry controller={controller} renderers={renderers} screen={screen} entry={entry} />
  ) : null;
}
