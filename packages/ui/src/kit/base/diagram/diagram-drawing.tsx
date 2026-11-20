import { useState, type ReactNode } from "react";
import { isWeb, ScrollView, YStack } from "tamagui";
import { component, emptyLine, size, space, type IconName } from "../../../catalog";
import { useEmptyThing, usePart } from "../../part";
import { useKit, useKitStyle, useWords } from "../../provider";
import { KitIcon, KitText, shifted } from "../text";

export type Drawing = { part?: string; loading?: boolean };
export type Target = { item?: string; part: string };

export function useDiagramTarget(
  target: Target | undefined,
  loading: boolean,
  label: string,
  selected?: boolean,
) {
  const { controller, interactive } = useKit();
  const address = usePart(target?.part ?? "root", !loading);
  if (loading) return {};
  if (!target) return { ...address, "aria-current": selected || undefined };
  const activate = (event: { stopPropagation?(): void }) => {
    event.stopPropagation?.();
    return controller?.press(address.testID);
  };
  const enabled = interactive && !!controller;
  return {
    ...address,
    accessibilityRole: "button" as const,
    accessibilityLabel: label,
    ...(!isWeb && selected !== undefined ? { accessibilityState: { selected } } : {}),
    "aria-current": selected || undefined,
    focusable: enabled,
    ...(enabled
      ? {
          cursor: "pointer" as const,
          onPress: activate,
          onKeyDown: (event: { key: string; preventDefault(): void; stopPropagation(): void }) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            return activate(event);
          },
        }
      : {}),
  };
}

export function HorizontalDiagramScroll({
  children,
  width,
  label,
  loading,
}: {
  children: ReactNode;
  width: number;
  label: string;
  loading: boolean;
}) {
  const { nativeHost } = useKit();
  const [view, setView] = useState(0);
  const [left, setLeft] = useState(0);
  const overflow = view > 0 && width > view;
  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={!loading}
        tabIndex={!loading && overflow ? 0 : -1}
        accessibilityRole="region"
        accessibilityLabel={loading ? undefined : label}
        onLayout={(event) => setView(event.nativeEvent.layout.width)}
        onScroll={(event) => setLeft(event.nativeEvent.contentOffset.x)}
        onFocus={(event: { target: unknown }) => nativeHost?.ensureVisible?.(event.target)}
        scrollEventThrottle={16}
      >
        {children}
      </ScrollView>
      {overflow && (
        <YStack
          marginHorizontal={space.md}
          marginBottom={space.md}
          height={space.xs}
          borderRadius={space.xs}
          backgroundColor="$line"
          aria-hidden
        >
          <YStack
            left={`${(Math.max(0, Math.min(width - view, left)) / width) * 100}%`}
            width={`${(view / width) * 100}%`}
            height="100%"
            borderRadius={space.xs}
            backgroundColor={loading ? "$line" : "$muted"}
          />
        </YStack>
      )}
    </>
  );
}

export function DiagramEmpty({ icon, loading }: { icon: IconName; loading: boolean }) {
  const thing = useEmptyThing();
  const { lang } = useWords();
  return (
    <YStack alignItems="center" padding={space.xl} gap={space.md}>
      <YStack
        width={size.avatar.md}
        height={size.avatar.md}
        borderRadius={size.avatar.md}
        backgroundColor={loading ? "$line" : "$raised"}
        alignItems="center"
        justifyContent="center"
        aria-hidden
        accessibilityElementsHidden
      >
        {!loading && <KitIcon name={icon} tone="muted" scale="lg" decorative />}
      </YStack>
      {loading ? (
        <YStack width="40%" alignItems="center">
          <DiagramBar width="100%" />
        </YStack>
      ) : (
        <KitText tone="muted" align="center" part={null}>
          {emptyLine(thing, lang)}
        </KitText>
      )}
    </YStack>
  );
}

export function DiagramBar({ width, height = space.sm }: { width: number | `${number}%`; height?: number }) {
  const ks = useKitStyle();
  return (
    <YStack
      width={width}
      height={height}
      maxWidth="100%"
      flexShrink={component.base.none}
      borderRadius={shifted("sm", ks.radiusShift)}
      backgroundColor="$line"
      aria-hidden
      accessibilityElementsHidden
    />
  );
}
