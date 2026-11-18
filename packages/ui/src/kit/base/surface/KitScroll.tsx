import { Children, useRef, type ReactNode } from "react";
import { ScrollView, YStack } from "tamagui";
import { ChevronDown, ChevronRight } from "@tamagui/lucide-icons";
import { component, emptyLine, radius, size, space } from "../../../catalog";
import { usePart, useEmptyThing } from "../../part";
import { useKitStyle } from "../../provider";
import { KitText, shifted } from "../text";

type ScrollNode = {
  getScrollableNode?: () => HTMLElement;
  scrollTo?: (options: { x?: number; y?: number; animated: boolean }) => void;
};
type ScrollProps = {
  part?: string;
  loading?: boolean;
  children: ReactNode;
  label: string;
  axis?: "vertical" | "horizontal";
  bounded?: boolean;
};

function scrollKey(event: { key: string; target: unknown; currentTarget: unknown; preventDefault(): void }) {
  if (event.target !== event.currentTarget) return;
  const node = event.currentTarget as HTMLElement;
  const page = node.clientHeight;
  const moves: Record<string, [number, number]> = {
    ArrowDown: [0, size.control.md],
    ArrowUp: [0, -size.control.md],
    ArrowRight: [size.control.md, 0],
    ArrowLeft: [-size.control.md, 0],
    PageDown: [0, page],
    PageUp: [0, -page],
    " ": [0, page],
  };
  if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    node.scrollTo({
      top: event.key === "Home" ? 0 : node.scrollHeight,
      left: event.key === "Home" ? 0 : node.scrollWidth,
    });
  } else if (moves[event.key]) {
    event.preventDefault();
    const [left, top] = moves[event.key]!;
    node.scrollBy({ left, top });
  }
}

function ScrollContent({ loading, children }: Pick<ScrollProps, "loading" | "children">) {
  const ks = useKitStyle();
  const thing = useEmptyThing();
  const empty = Children.toArray(children).length === 0;
  return (
    <YStack padding={space[ks.density.cardPad]} gap={space.sm}>
      {loading ? (
        <YStack height={component.base.emptyMinHeight - space.xl} gap={space.lg} aria-hidden>
          {Array.from({ length: 3 }, (_, index) => (
            <YStack
              key={index}
              height={size.icon.sm}
              width={index % 2 ? "72%" : "88%"}
              backgroundColor="$line"
              borderRadius={shifted("sm", ks.radiusShift)}
            />
          ))}
        </YStack>
      ) : empty ? (
        <YStack paddingVertical={space.xl}>
          <KitText tone="muted" align="center" part={null}>
            {emptyLine(thing)}
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

function ScrollCue({ loading, axis }: Pick<ScrollProps, "loading" | "axis">) {
  const Cue = axis === "horizontal" ? ChevronRight : ChevronDown;
  return (
    <YStack
      height={size.control.md}
      alignItems="center"
      justifyContent="center"
      borderTopWidth={component.base.borderWidth}
      borderColor="$line"
      aria-hidden
    >
      {loading ? (
        <YStack width={size.icon.md} height={size.icon.sm} backgroundColor="$line" borderRadius={radius.sm} />
      ) : (
        <Cue size={size.icon.md} color="$muted" />
      )}
    </YStack>
  );
}

/** A labelled, focusable scroll region; the control-sized cue remains visible without OS scrollbars. */
export function KitScroll({
  part = "root",
  loading = false,
  children,
  label,
  axis = "vertical",
  bounded = true,
}: ScrollProps) {
  const ks = useKitStyle();
  const address = usePart(part);
  const scroll = useRef<ScrollNode>(null);
  const empty = Children.toArray(children).length === 0;
  return (
    <YStack
      {...address}
      width="100%"
      minWidth={component.base.none}
      borderRadius={shifted("md", ks.radiusShift)}
      borderWidth={component.base.borderWidth}
      borderColor="$line"
      backgroundColor="$raised"
      overflow="hidden"
      aria-busy={loading}
    >
      <ScrollView
        ref={scroll as never}
        horizontal={axis === "horizontal"}
        showsVerticalScrollIndicator
        showsHorizontalScrollIndicator
        {...(bounded ? { maxHeight: component.base.emptyMinHeight } : {})}
        {...({
          role: "region",
          tabIndex: loading || empty ? -1 : 0,
          "aria-label": label,
          onKeyDown: scrollKey,
        } as object)}
        onFocus={(event: { target: unknown }) =>
          focusScroll(event.target as HTMLElement, scroll.current?.getScrollableNode?.())
        }
      >
        <ScrollContent loading={loading}>{children}</ScrollContent>
      </ScrollView>
      {(loading || !empty) && <ScrollCue loading={loading} axis={axis} />}
    </YStack>
  );
}
