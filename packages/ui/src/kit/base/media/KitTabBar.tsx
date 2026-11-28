import { XStack, YStack, isWeb } from "tamagui";
import { badgeLine, component, radius, size, space, type IconName } from "../../../catalog";
import { useKit, useWords } from "../../provider";
import { minimumTouchSize, webActivation } from "../../a11y";
import { PartContext, usePart, usePartContext } from "../../part";
import { KitIcon } from "../text";
import { KitText } from "../text";

type Tab = { id: string; icon: IconName; label: string; goto: string; count?: number | undefined };
const webTab = { tag: "button", type: "button" } as const;
const tabFocus = {
  outlineColor: "$accent",
  outlineStyle: "solid",
  outlineWidth: component.base.strongBorder,
  outlineOffset: -component.base.strongBorder,
} as const;

function TabGlyph({ tab, on }: { tab: Tab; on: boolean }) {
  const { lang } = useWords();
  const badge = tab.count ? badgeLine(tab.count, lang) : undefined;
  return (
    <XStack
      alignItems="center"
      gap={space.xs}
      borderRadius={radius.pill}
      paddingHorizontal={badge ? component.base.none : space.md}
      backgroundColor={on ? "$accentSoft" : undefined}
    >
      <KitIcon name={tab.icon} tone={on ? "accent" : "muted"} scale="lg" part="icon" />
      {badge && (
        <YStack
          minWidth={size.icon.sm}
          paddingHorizontal={space.sm}
          paddingVertical={space.xs}
          borderRadius={radius.pill}
          backgroundColor="$accent"
        >
          <KitText role="caption" tone="onAccent" align="center" part="badge">
            {badge}
          </KitText>
        </YStack>
      )}
    </XStack>
  );
}

function TabItem({ tab, on }: { tab: Tab; on: boolean }) {
  const { lang, words } = useWords();
  const kit = useKit();
  const part = usePart();
  const onPress = kit.interactive && kit.onLink ? () => kit.onLink?.(tab.goto, part.testID) : undefined;
  return (
    <YStack
      {...part}
      {...(isWeb && onPress ? webTab : {})}
      flex={1}
      flexBasis={component.base.none}
      minWidth={minimumTouchSize}
      minHeight={size.control.lg}
      alignItems="center"
      justifyContent="flex-start"
      gap={space.xs}
      paddingVertical={space.md}
      backgroundColor="transparent"
      borderWidth={component.base.none}
      focusVisibleStyle={tabFocus}
      accessibilityRole="tab"
      aria-selected={on}
      accessibilityLabel={tab.count ? `${tab.label}, ${badgeLine(tab.count, lang)}` : tab.label}
      {...(onPress ? { onPress } : {})}
      {...webActivation(onPress)}
    >
      <TabGlyph {...{ tab, on }} />
      <KitText role="caption" tone={on ? "accent" : "muted"} part="label" align="center" breakLongWords>
        {tab.label}
      </KitText>
      {on && (
        <XStack
          alignSelf="stretch"
          alignItems="center"
          justifyContent="center"
          flexWrap="wrap"
          gap={space.xs / 2}
          aria-hidden
          accessibilityElementsHidden
        >
          <KitIcon name="check" scale="sm" tone="accent" decorative />
          <YStack maxWidth="100%">
            <KitText role="caption" part={null} align="center" breakLongWords>
              {words.selectedLabel}
            </KitText>
          </YStack>
        </XStack>
      )}
    </YStack>
  );
}

/**
 * The bottom navigation: 2 to 5 equal tabs on the surface under a top rule, icon over label, the
 * selected one (`at`) with a check and caption. Each tab is an item (`root`, `icon`, `label`),
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
