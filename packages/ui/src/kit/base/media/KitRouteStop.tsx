import { useSignatureProgress } from "../../motion";
import { Children, isValidElement, useState, type ComponentProps, type ReactNode } from "react";
import { Check, ChevronRight, MapPin } from "@tamagui/lucide-icons";
import { XStack, YStack } from "tamagui";
import { component, radius, size, space, type as typography } from "../../../catalog";
import { useKit, useKitStyle } from "../../provider";
import { PartContext, usePart, usePartContext } from "../../part";
import { KitIcon, KitText } from "../text";

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
  linked,
  pad,
  line,
}: Pick<RouteProps, "position" | "mark"> & { loading: boolean; linked: boolean; pad: number; line: number }) {
  const progress = useSignatureProgress("route_draw");
  return (
    <YStack width={size.icon.md} alignItems="center" aria-hidden accessibilityElementsHidden>
      {/* The connector runs from the stop above to the stop below, behind the mark. */}
      <YStack
        position="absolute"
        top={position === "start" ? pad + line / 2 : 0}
        bottom={position === "end" ? undefined : 0}
        height={position === "end" ? pad + line / 2 : undefined}
        width={component.base.strongBorder}
        backgroundColor={loading || linked || mark !== "route" ? "$line" : "$accent"}
        {...(loading ? {} : { opacity: progress, scaleY: progress })}
      />
      <YStack height={line} marginTop={pad} justifyContent="center" alignItems="center">
        <Mark {...{ position, mark, loading }} />
      </YStack>
    </YStack>
  );
}

function loadingLines(children: ReactNode): ComponentProps<typeof KitText>[] {
  return Children.toArray(children).flatMap((node) => {
    if (!isValidElement<ComponentProps<typeof KitText>>(node)) return [];
    if (node.type === KitText && typeof node.props.children === "string") return [node.props];
    return loadingLines(node.props.children);
  });
}

type StopContentProps = { pad: number; children: ReactNode; loading: boolean; label: string };
function StopContent({ pad, children, loading, label }: StopContentProps) {
  const [height, setHeight] = useState(0);
  if (!loading)
    return (
      <YStack flex={1} paddingVertical={pad} onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>
        {children}
      </YStack>
    );
  const lines = loadingLines(children);
  return (
    <YStack flex={1} minHeight={height} paddingVertical={pad} position="relative" aria-hidden>
      {(lines.length ? lines : [{ children: label }]).map((props, i) => (
        <YStack key={i} justifyContent="center">
          <YStack opacity={component.base.none} accessibilityElementsHidden pointerEvents="none">
            <KitText {...props} part={null} goto={undefined} item={undefined} />
          </YStack>
          <YStack
            position="absolute"
            width="72%"
            height={space.sm}
            borderRadius={radius.sm}
            backgroundColor="$line"
          />
        </YStack>
      ))}
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
  if (empty)
    return (
      <YStack {...target} padding={space.md} alignItems="center" gap={space.sm} accessibilityLabel={label}>
        <KitIcon name="sparkles" tone="muted" decorative />
        {children}
      </YStack>
    );
  return (
    <XStack
      {...target}
      gap={space[ks.density.gap]}
      paddingHorizontal={space.md}
      minHeight={goto ? size.control.md : undefined}
      accessibilityLabel={loading ? undefined : label}
      aria-busy={loading || undefined}
    >
      <Rail {...{ position, mark, loading, linked: Boolean(goto), pad, line }} />
      <StopContent {...{ pad, loading, label }}>{children}</StopContent>
      {goto && (
        <YStack width={size.icon.sm} height={line} marginTop={pad} justifyContent="center" aria-hidden>
          {!loading && <ChevronRight size={size.icon.sm} color="$muted" />}
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
