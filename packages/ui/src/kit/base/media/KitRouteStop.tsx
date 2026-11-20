import { useSignatureProgress } from "../../motion";
import type { ReactNode } from "react";
import { Check, ChevronRight, MapPin } from "@tamagui/lucide-icons";
import { isWeb, XStack, YStack } from "tamagui";
import { component, radius, size, space, type as typography } from "../../../catalog";
import { useKit, useKitStyle } from "../../provider";
import { PartContext, usePart, usePartContext } from "../../part";

type Position = "start" | "middle" | "end";
type RouteProps = {
  item: string;
  label: string;
  position: Position;
  children: ReactNode;
  goto?: string | undefined;
  mark?: "route" | "dot" | "check" | undefined;
};

function Mark({ position, mark, loading }: Pick<RouteProps, "position" | "mark"> & { loading: boolean }) {
  if (loading || mark === "check")
    return (
      <YStack
        width={size.icon.md}
        height={size.icon.md}
        alignItems="center"
        justifyContent="center"
        borderRadius={radius.pill}
        backgroundColor={loading ? "$line" : "$goodSoft"}
      >
        {!loading && <Check size={size.icon.sm} color="$good" />}
      </YStack>
    );
  if (mark === "dot")
    return <YStack width={space.sm} height={space.sm} borderRadius={radius.pill} backgroundColor="$muted" />;
  if (position === "end")
    return <MapPin size={size.icon.md} color="$accent" fill="currentColor" aria-hidden />;
  const ring = position === "start";
  return (
    <YStack
      width={ring ? size.icon.sm : space.sm + space.xs / 2}
      height={ring ? size.icon.sm : space.sm + space.xs / 2}
      borderRadius={radius.pill}
      borderWidth={ring ? component.base.strongBorder * 1.5 : component.base.none}
      borderColor="$accent"
      backgroundColor={ring ? "$surface" : "$accent"}
    />
  );
}

function useStopLink(goto: RouteProps["goto"], loading: boolean, empty: boolean) {
  const kit = useKit();
  const address = usePart("root", !loading);
  const linked = Boolean(goto && !empty && !loading);
  const press = () => {
    if (goto) kit.onLink?.(goto, address.testID);
  };
  return {
    ...(loading ? {} : address),
    accessibilityRole: loading ? undefined : linked ? ("link" as const) : ("text" as const),
    ...(linked && kit.interactive
      ? {
          focusable: true,
          cursor: "pointer" as const,
          onPress: (event: { stopPropagation?(): void }) => {
            event.stopPropagation?.();
            return press();
          },
          onKeyDown: (event: { key?: string; preventDefault(): void; stopPropagation(): void }) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            event.stopPropagation();
            return press();
          },
        }
      : {}),
  };
}

function Rail({
  position,
  mark,
  loading,
  empty,
  pad,
  line,
}: Pick<RouteProps, "position" | "mark"> & { loading: boolean; empty: boolean; pad: number; line: number }) {
  const progress = useSignatureProgress("route_draw");
  return (
    <YStack width={size.icon.md} alignItems="center" aria-hidden accessibilityElementsHidden>
      {/* The connector runs from the stop above to the stop below, behind the mark. */}
      {!empty && (
        <YStack
          position="absolute"
          top={position === "start" ? pad + line / 2 : 0}
          bottom={position === "end" ? undefined : 0}
          height={position === "end" ? pad + line / 2 : undefined}
          width={component.base.strongBorder}
          backgroundColor={loading || mark !== "route" ? "$line" : "$accent"}
          {...(loading ? {} : { opacity: progress, scaleY: progress })}
        />
      )}
      <YStack height={line} marginTop={pad} justifyContent="center" alignItems="center">
        <Mark {...{ position, mark, loading }} />
      </YStack>
    </YStack>
  );
}

function StopContent({ pad, children, loading }: { pad: number; children: ReactNode; loading: boolean }) {
  if (!loading)
    return (
      <YStack flex={1} paddingVertical={pad}>
        {children}
      </YStack>
    );
  return (
    <YStack flex={1} paddingVertical={pad} position="relative">
      <YStack
        aria-hidden
        accessibilityElementsHidden
        opacity={component.base.none}
        pointerEvents="none"
        {...(isWeb ? { inert: true } : {})}
      >
        {children}
      </YStack>
      <YStack
        position="absolute"
        top={pad + (typography.body.lineHeight - space.sm) / 2}
        width="72%"
        height={space.sm}
        borderRadius={radius.sm}
        backgroundColor="$line"
        aria-hidden
      />
    </YStack>
  );
}

function Stop({ label, position, children, goto, mark = "route" }: Omit<RouteProps, "item">) {
  const ks = useKitStyle();
  const { state } = usePartContext();
  const loading = state === "loading";
  const empty = state === "empty";
  const target = useStopLink(goto, loading, empty);
  const line = typography.body.lineHeight;
  const pad = space[ks.density.rowPad];
  return (
    <XStack
      {...target}
      gap={space[ks.density.gap]}
      paddingHorizontal={space.md}
      minHeight={goto ? size.control.md : undefined}
      accessibilityLabel={loading ? undefined : label}
      aria-busy={loading || undefined}
    >
      <Rail {...{ position, mark: empty ? "dot" : mark, loading, empty, pad, line }} />
      <StopContent {...{ pad, loading }}>{children}</StopContent>
      {goto && (
        <YStack width={size.icon.sm} height={line} marginTop={pad} justifyContent="center" aria-hidden>
          {!loading && !empty && <ChevronRight size={size.icon.sm} color="$accent" />}
        </YStack>
      )}
    </XStack>
  );
}

/**
 * One stop on a route, with `KitRow`'s insets: a start ring, a dot between, a filled pin at the end,
 * centred on the first text line. Milestones can opt into a dot/check and link the entire item.
 */
export function KitRouteStop({ item, ...props }: RouteProps) {
  const context = usePartContext();
  return (
    <PartContext.Provider value={{ ...context, item }}>
      <Stop {...props} />
    </PartContext.Provider>
  );
}
