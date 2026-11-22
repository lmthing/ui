import { Children, useContext, useRef, useState, type ReactNode } from "react";
import { ScrollView, XStack, YStack, isWeb, styled } from "tamagui";
import { ChevronDown, ChevronRight } from "@tamagui/lucide-icons";
import { component, emptyLine, size, space, type as typography } from "../../../catalog";
import { PartRefScope, usePart, useEmptyThing } from "../../part";
import { useKit, useKitStyle, useWords } from "../../provider";
import { KitIcon, KitText, shifted, surfaceOf } from "../text";
import { CardGutterContext } from "./KitCard";
import type { ScrollHandle } from "./scroll-follow";
import { focusScroll, scrollKey } from "./scroll-web";
import { useScrollFollow } from "./use-scroll-follow";
const Bar = styled(YStack, { height: size.icon.sm, backgroundColor: "$line" });
type ScrollProps = {
  part?: string;
  loading?: boolean;
  children: ReactNode;
  label: string;
  axis?: "vertical" | "horizontal";
  bounded?: boolean;
  follow?: { address?: string | undefined; enabled: boolean };
};

function ScrollLoading({ horizontal }: { horizontal: boolean }) {
  const ks = useKitStyle();
  const fieldHeight = size.control.md + component.base.borderWidth * 2;
  if (horizontal)
    return (
      <XStack gap={space.md} aria-hidden>
        {Array.from({ length: 3 }, (_, index) => (
          <YStack key={index} width={size.control.md * 3}>
            <YStack height={typography.body.lineHeight} justifyContent="center">
              <Bar width="72%" borderRadius={shifted("sm", ks.radiusShift)} />
            </YStack>
            <Bar height={fieldHeight} borderRadius={shifted("md", ks.radiusShift)} />
          </YStack>
        ))}
      </XStack>
    );
  return (
    <YStack minHeight={component.base.emptyMinHeight + space.sm} gap={space.lg} aria-hidden>
      {Array.from({ length: 5 }, (_, index) => (
        <Bar key={index} width={index % 2 ? "72%" : "88%"} borderRadius={shifted("sm", ks.radiusShift)} />
      ))}
    </YStack>
  );
}
function ScrollContent({
  loading,
  children,
  horizontal,
  viewport,
  inset,
}: Pick<ScrollProps, "loading" | "children"> & {
  horizontal: boolean;
  viewport: number;
  inset: boolean;
}) {
  const { lang } = useWords();
  const ks = useKitStyle();
  const line = emptyLine(useEmptyThing(), lang);
  const empty = Children.toArray(children).length === 0;
  return (
    <YStack
      paddingHorizontal={inset ? component.base.none : space.md}
      paddingVertical={inset ? component.base.none : space[ks.density.rowPad]}
      gap={space.sm}
      {...(horizontal && empty && !loading ? { width: viewport || component.base.emptyMinHeight } : {})}
    >
      {loading ? (
        <ScrollLoading horizontal={horizontal} />
      ) : empty ? (
        <YStack paddingVertical={space.xl} alignItems="center" gap={space.md}>
          <KitIcon name="sparkles" tone="muted" scale="lg" decorative />
          <KitText tone="muted" align="center" part={null}>
            {line}
          </KitText>
        </YStack>
      ) : (
        children
      )}
    </YStack>
  );
}

function useScrollGeometry(horizontal: boolean) {
  const [view, setView] = useState({ width: 0, height: 0 });
  const layout = useRef(view);
  const [content, setContent] = useState({ width: 0, height: 0 });
  const axis = horizontal ? "width" : "height";
  return {
    layout,
    ready: isWeb || view[axis] > 0,
    viewport: view.width,
    overflow: content[axis] > view[axis] + component.base.borderWidth,
    onLayout: (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
      layout.current = event.nativeEvent.layout;
      setView(layout.current);
    },
    onContentSizeChange: (width: number, height: number) => setContent({ width, height }),
  };
}

function ScrollCue({ horizontal }: { horizontal: boolean }) {
  const Cue = horizontal ? ChevronRight : ChevronDown;
  return (
    <YStack
      height={size.control.md}
      alignItems="center"
      justifyContent="center"
      borderTopWidth={component.base.borderWidth}
      borderColor="$line"
      aria-hidden
    >
      <Cue size={size.icon.md} color="$muted" />
    </YStack>
  );
}

function useScrollViewport(horizontal: boolean, loading: boolean, follow: ScrollProps["follow"]) {
  const kit = useKit();
  const scroll = useRef<ScrollHandle>(null);
  const { viewport, overflow, layout, ready, ...geometry } = useScrollGeometry(horizontal);
  const { register, manualKey, nativeProps } = useScrollFollow(
    follow,
    scroll,
    layout,
    ready && !loading,
    horizontal,
    kit.motion === "lively",
  );
  return {
    viewport,
    overflow,
    register,
    manualKey,
    scrollProps: {
      ref: scroll as never,
      ...nativeProps,
      ...geometry,
      onFocus: (event: { target: unknown }) => {
        const node = scroll.current?.getScrollableNode?.();
        if (node) focusScroll(event.target as HTMLElement, node);
        else kit.nativeHost?.ensureVisible?.(event.target);
      },
    },
  };
}

/** A labelled, token-bounded scroll region; a visible cue appears only when content overflows. */
export function KitScroll({
  part = "root",
  loading = false,
  children,
  label,
  axis = "vertical",
  bounded = true,
  follow,
}: ScrollProps) {
  const ks = useKitStyle();
  const address = usePart(part);
  const horizontal = axis === "horizontal";
  const inset = useContext(CardGutterContext);
  const { viewport, overflow, register, manualKey, scrollProps } = useScrollViewport(
    horizontal,
    loading,
    follow,
  );
  const empty = Children.toArray(children).length === 0;
  return (
    <YStack
      {...address}
      {...(inset ? {} : surfaceOf(ks.surface))}
      width="100%"
      minWidth={component.base.none}
      borderRadius={inset ? undefined : shifted("lg", ks.radiusShift)}
      overflow="hidden"
      aria-busy={loading}
    >
      <ScrollView
        {...scrollProps}
        horizontal={horizontal}
        showsVerticalScrollIndicator
        showsHorizontalScrollIndicator
        scrollEnabled={!loading}
        contentContainerStyle={{ minWidth: "100%" }}
        {...(bounded ? { maxHeight: component.base.emptyMinHeight } : {})}
        {...({
          role: "region",
          tabIndex: loading || empty ? -1 : 0,
          "aria-label": label,
          onKeyDown: (event: Parameters<typeof scrollKey>[0]) => scrollKey(event, horizontal, manualKey),
        } as object)}
      >
        <PartRefScope.Provider value={register}>
          <ScrollContent {...{ loading, horizontal, viewport, inset }}>{children}</ScrollContent>
        </PartRefScope.Provider>
      </ScrollView>
      {overflow && <ScrollCue horizontal={horizontal} />}
    </YStack>
  );
}
