import { Children, useRef, useState, type ReactNode } from "react";
import { ScrollView, XStack, YStack, styled } from "tamagui";
import { ChevronDown, ChevronRight } from "@tamagui/lucide-icons";
import { component, emptyLine, size, space, type as typography } from "../../../catalog";
import { usePart, useEmptyThing } from "../../part";
import { useKit, useKitStyle, useWords } from "../../provider";
import { KitIcon, KitText, shifted, surfaceOf } from "../text";
const Bar = styled(YStack, { height: size.icon.sm, backgroundColor: "$line" });
type ScrollProps = {
  part?: string;
  loading?: boolean;
  children: ReactNode;
  label: string;
  axis?: "vertical" | "horizontal";
  bounded?: boolean;
};

function scrollKey(
  event: { key: string; target: unknown; currentTarget: unknown; preventDefault(): void },
  horizontal: boolean,
) {
  if (event.target !== event.currentTarget) return;
  const node = event.currentTarget as HTMLElement;
  const page = horizontal ? node.clientWidth : node.clientHeight;
  const paging: [number, number] = horizontal ? [page, 0] : [0, page];
  const moves: Record<string, [number, number]> = {
    ArrowDown: [0, size.control.md],
    ArrowUp: [0, -size.control.md],
    ArrowRight: [size.control.md, 0],
    ArrowLeft: [-size.control.md, 0],
    PageDown: paging,
    PageUp: [-paging[0], -paging[1]],
    " ": paging,
  };
  if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    node.scrollBy({
      top: (event.key === "Home" ? 0 : node.scrollHeight) - node.scrollTop,
      left: (event.key === "Home" ? 0 : node.scrollWidth) - node.scrollLeft,
    });
  } else if (moves[event.key]) {
    event.preventDefault();
    const [left, top] = moves[event.key]!;
    node.scrollBy({ left, top });
  }
}
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
}: Pick<ScrollProps, "loading" | "children"> & {
  horizontal: boolean;
  viewport: number;
}) {
  const { lang } = useWords();
  const ks = useKitStyle();
  const line = emptyLine(useEmptyThing(), lang);
  const empty = Children.toArray(children).length === 0;
  return (
    <YStack
      paddingHorizontal={space.md}
      paddingVertical={space[ks.density.rowPad]}
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

function focusScroll(target: HTMLElement, node?: HTMLElement) {
  if (!node || target === node || !target.getBoundingClientRect) return;
  const box = target.getBoundingClientRect(),
    viewport = node.getBoundingClientRect();
  node.scrollBy({
    top: box.bottom > viewport.bottom ? box.bottom - viewport.bottom : Math.min(0, box.top - viewport.top),
    left: box.right > viewport.right ? box.right - viewport.right : Math.min(0, box.left - viewport.left),
  });
}

function useScrollGeometry(horizontal: boolean) {
  const [view, setView] = useState({ width: 0, height: 0 });
  const [content, setContent] = useState({ width: 0, height: 0 });
  const axis = horizontal ? "width" : "height";
  return {
    viewport: view.width,
    overflow: content[axis] > view[axis] + component.base.borderWidth,
    onLayout: (event: { nativeEvent: { layout: { width: number; height: number } } }) =>
      setView(event.nativeEvent.layout),
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

/** A labelled, token-bounded scroll region; a visible cue appears only when content overflows. */
export function KitScroll({
  part = "root",
  loading = false,
  children,
  label,
  axis = "vertical",
  bounded = true,
}: ScrollProps) {
  const ks = useKitStyle(),
    kit = useKit();
  const address = usePart(part);
  const scroll = useRef<{ getScrollableNode?: () => HTMLElement }>(null);
  const horizontal = axis === "horizontal";
  const { viewport, overflow, ...geometry } = useScrollGeometry(horizontal);
  const empty = Children.toArray(children).length === 0;
  return (
    <YStack
      {...address}
      {...surfaceOf(ks.surface)}
      width="100%"
      minWidth={component.base.none}
      borderRadius={shifted("lg", ks.radiusShift)}
      overflow="hidden"
      aria-busy={loading}
    >
      <ScrollView
        ref={scroll as never}
        horizontal={horizontal}
        showsVerticalScrollIndicator
        showsHorizontalScrollIndicator
        scrollEnabled={!loading}
        contentContainerStyle={{ minWidth: "100%" }}
        {...geometry}
        {...(bounded ? { maxHeight: component.base.emptyMinHeight } : {})}
        {...({
          role: "region",
          tabIndex: loading || empty ? -1 : 0,
          "aria-label": label,
          onKeyDown: (event: Parameters<typeof scrollKey>[0]) => scrollKey(event, horizontal),
        } as object)}
        onFocus={(event: { target: unknown }) => {
          const node = scroll.current?.getScrollableNode?.();
          if (node) focusScroll(event.target as HTMLElement, node);
          else kit.nativeHost?.ensureVisible?.(event.target);
        }}
      >
        <ScrollContent loading={loading} horizontal={horizontal} viewport={viewport}>
          {children}
        </ScrollContent>
      </ScrollView>
      {overflow && <ScrollCue horizontal={horizontal} />}
    </YStack>
  );
}
