import { XStack, YStack } from "tamagui";
import { badgeLine, component, radius, size, space, type IconName } from "../../catalog";
import { useKit } from "../provider";
import { PartContext, usePart, usePartContext } from "../part";
import { KitIcon } from "./KitIcon";
import { KitText } from "./KitText";

type Tab = { id: string; icon: IconName; label: string; goto: string; count?: number | undefined };

function TabItem({ tab, on }: { tab: Tab; on: boolean }) {
  const kit = useKit();
  const part = usePart();
  return (
    <YStack
      {...part}
      flex={1}
      flexBasis={component.base.none}
      minHeight={size.control.lg}
      alignItems="center"
      justifyContent="center"
      gap={space.xs}
      paddingVertical={space.md}
      accessibilityRole="tab"
      aria-selected={on}
      accessibilityLabel={tab.count ? `${tab.label}, ${badgeLine(tab.count)}` : tab.label}
      {...(kit.interactive ? { onPress: () => kit.onLink?.(tab.goto, part.testID) } : {})}
    >
      <YStack position="relative">
        <KitIcon name={tab.icon} tone={on ? "accent" : "muted"} scale="lg" part="icon" />
        {Boolean(tab.count) && (
          <YStack
            position="absolute"
            top={-space.xs}
            right={-space.sm}
            minWidth={size.icon.sm}
            paddingHorizontal={space.xs}
            borderRadius={radius.pill}
            backgroundColor="$accent"
          >
            <KitText role="caption" tone="onAccent" align="center" part="badge">
              {badgeLine(tab.count!)}
            </KitText>
          </YStack>
        )}
      </YStack>
      <KitText role="caption" tone={on ? "accent" : "muted"} part="label" lines={1}>
        {tab.label}
      </KitText>
    </YStack>
  );
}

/**
 * The bottom navigation: 2 to 5 equal tabs on the surface under a top rule, icon over label, the
 * selected one (`at`) in accent and the rest muted. Each tab is an item (`root`, `icon`, `label`),
 * role tab, and goes to its `goto` when pressed.
 */
export function KitTabBar({ tabs, at }: { tabs: readonly Tab[]; at: number }) {
  const context = usePartContext();
  return (
    <XStack
      {...usePart()}
      backgroundColor="$surface"
      borderTopWidth={component.base.borderWidth}
      borderTopColor="$line"
      paddingHorizontal={space.xs}
      accessibilityRole="tablist"
    >
      {tabs.map((tab, index) => (
        <PartContext.Provider key={tab.id} value={{ ...context, item: tab.id }}>
          <TabItem tab={tab} on={index === at} />
        </PartContext.Provider>
      ))}
    </XStack>
  );
}
