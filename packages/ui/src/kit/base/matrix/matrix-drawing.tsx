import { Children, isValidElement, useRef, type ReactNode } from "react";
import { ScrollView, XStack, YStack } from "tamagui";
import { component, size, space, type as typography } from "../../../catalog";
import { useKit, useKitStyle } from "../../provider";
import { KitText, shifted, type TextRole } from "../text";
import { matrixKey } from "./matrix-layout";

type ContentProps = {
  children?: ReactNode;
  label?: string;
  hint?: string;
  value?: ReactNode;
  role?: TextRole;
  numberScale?: "display" | "compact";
  align?: "start" | "center" | "end";
  lines?: number;
  tabular?: boolean;
  done?: boolean;
  shape?: string;
  photo?: string;
  initials?: string;
  gap?: number;
  flex?: number;
  justifyContent?: "center" | "space-between";
  alignItems?: "center";
  flexDirection?: "row" | "column";
};

function LoadingText({ children, role = "body", ...props }: ContentProps) {
  const ks = useKitStyle();
  const line = typography[role === "number" && props.numberScale === "compact" ? "body" : role];
  return (
    <YStack position="relative" overflow="hidden" alignSelf="flex-start" maxWidth="100%" aria-hidden>
      <YStack opacity={component.base.none}>
        <KitText {...props} role={role} part={null}>
          {children}
        </KitText>
      </YStack>
      {Array.from({ length: 8 }, (_, index) => (
        <YStack
          key={index}
          position="absolute"
          top={index * line.lineHeight + (line.lineHeight - space.md) / 2}
          width="100%"
          height={space.md}
          backgroundColor="$line"
          borderRadius={shifted("sm", ks.radiusShift)}
        />
      ))}
    </YStack>
  );
}

/** Project caller text and child geometry into neutral drawings; never mount loading controls. */
function loadingNode(node: ReactNode): ReactNode {
  if (typeof node === "string" || typeof node === "number") return <LoadingText>{node}</LoadingText>;
  if (!isValidElement<ContentProps>(node)) return null;
  const props = node.props;
  if (node.type === KitText) return <LoadingText {...props} />;
  if (props.done !== undefined || props.photo || props.initials || props.shape)
    return (
      <YStack
        width={props.shape === "avatar" ? size.avatar.lg : size.control.md}
        height={props.shape === "avatar" ? size.avatar.lg : size.control.md}
        backgroundColor="$line"
      />
    );
  if (props.label || props.hint)
    return (
      <YStack
        minWidth={size.control.md}
        minHeight={size.control.md}
        paddingHorizontal={space.md}
        justifyContent="center"
        backgroundColor="$line"
      >
        <YStack opacity={component.base.none}>
          <KitText role="label" part={null}>
            {props.label ?? props.value ?? props.hint}
          </KitText>
        </YStack>
      </YStack>
    );
  return (
    <YStack
      gap={props.gap}
      flex={props.flex}
      justifyContent={props.justifyContent}
      alignItems={props.alignItems}
      flexDirection={props.flexDirection ?? (node.type === XStack ? "row" : "column")}
    >
      {Children.toArray(props.children).map((child, index) => (
        <MatrixContent key={index} loading>
          {child}
        </MatrixContent>
      ))}
    </YStack>
  );
}

export function MatrixContent({ children, loading }: { children: ReactNode; loading?: boolean }) {
  return loading ? (
    <YStack aria-hidden>
      {Children.toArray(children).map((child, index) => (
        <YStack key={index}>{loadingNode(child)}</YStack>
      ))}
    </YStack>
  ) : (
    <>{children}</>
  );
}

export function MatrixScroll({
  children,
  loading = false,
  label,
}: {
  children: ReactNode;
  loading?: boolean;
  label: string;
}) {
  const scroll = useRef<{ getScrollableNode?: () => HTMLElement }>(null);
  const kit = useKit();
  return (
    <ScrollView
      ref={scroll as never}
      horizontal
      minWidth={component.base.none}
      showsHorizontalScrollIndicator
      contentContainerStyle={{ minWidth: "100%" }}
      {...({
        role: "region",
        tabIndex: loading ? -1 : 0,
        "aria-label": label,
        onKeyDown: matrixKey,
      } as object)}
      onFocus={(event: { target: unknown }) => {
        const node = scroll.current?.getScrollableNode?.();
        const target = event.target as HTMLElement;
        if (!node || !target.getBoundingClientRect) kit.nativeHost?.ensureVisible?.(event.target);
        else {
          const box = target.getBoundingClientRect(),
            view = node.getBoundingClientRect();
          node.scrollBy({
            left: box.right > view.right ? box.right - view.right : Math.min(0, box.left - view.left),
          });
        }
      }}
    >
      <XStack>{children}</XStack>
    </ScrollView>
  );
}
