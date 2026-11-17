import type { ReactNode } from "react";
import { MapPin } from "@tamagui/lucide-icons";
import { XStack, YStack } from "tamagui";
import { component, radius, size, space, type as typography } from "../../catalog";
import { useKitStyle } from "../provider";
import { PartContext, usePart, usePartContext } from "../part";

type Position = "start" | "middle" | "end";

function Mark({ position }: { position: Position }) {
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

function Stop({ label, position, children }: { label: string; position: Position; children: ReactNode }) {
  const ks = useKitStyle();
  const line = typography.body.lineHeight;
  const pad = space[ks.density.rowPad];
  return (
    <XStack
      {...usePart()}
      gap={space[ks.density.gap]}
      paddingHorizontal={space.md}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <YStack width={size.icon.md} alignItems="center" aria-hidden accessibilityElementsHidden>
        {/* The connector runs from the stop above to the stop below, behind the mark. */}
        <YStack
          position="absolute"
          top={position === "start" ? pad + line / 2 : 0}
          bottom={position === "end" ? undefined : 0}
          height={position === "end" ? pad + line / 2 : undefined}
          width={component.base.strongBorder}
          backgroundColor="$line"
        />
        <YStack height={line} marginTop={pad} justifyContent="center" alignItems="center">
          <Mark position={position} />
        </YStack>
      </YStack>
      <YStack flex={1} paddingVertical={pad}>
        {children}
      </YStack>
    </XStack>
  );
}

/**
 * One stop on a route, with `KitRow`'s insets: a start ring, a dot between, a filled pin at the end,
 * centred on the first text line and joined to the next stop by a vertical connector. The marks are
 * decorative; the stop is a static item (`<item>/root`) and its `KitText` children share the item.
 */
export function KitRouteStop({
  item,
  ...props
}: {
  item: string;
  label: string;
  position: Position;
  children: ReactNode;
}) {
  const context = usePartContext();
  return (
    <PartContext.Provider value={{ ...context, item }}>
      <Stop {...props} />
    </PartContext.Provider>
  );
}
