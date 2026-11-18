import { XStack, YStack } from "tamagui";
import { component, loadingLabel, radius, size, space, type as typography } from "../../../catalog";
import { useKitStyle } from "../../provider";
import { KitText, shifted, surfaceOf } from "../text";
import { Bar } from "./skeleton-shapes";
import { SkeletonText, type ShapeProps, type SkeletonItem } from "./skeleton-content";

function SkeletonOption({
  item,
  look,
  reserveIcon,
}: {
  item: SkeletonItem;
  look: "cards" | "list";
  reserveIcon: boolean;
}) {
  const ks = useKitStyle();
  return (
    <YStack
      minHeight={size.control.md}
      paddingVertical={space[ks.density.rowPad]}
      paddingHorizontal={space.md}
      borderRadius={shifted("md", ks.radiusShift)}
      {...(look === "cards" ? surfaceOf(ks.surface) : {})}
    >
      <XStack gap={space.md} alignItems="flex-start">
        {reserveIcon && (
          <YStack width={size.icon.lg} height={typography.body.lineHeight} justifyContent="center">
            {item.icon && <Bar width={size.icon.lg} height={size.icon.lg} />}
          </YStack>
        )}
        <YStack flex={1}>
          <SkeletonText text={item.title ?? ""} role="body" />
        </YStack>
        <XStack gap={space.sm} height={typography.body.lineHeight} alignItems="center">
          {item.value && <SkeletonText text={item.value} role="body" />}
          {(look === "list" || item.on) && (
            <Bar
              width={size.icon.md}
              height={size.icon.md}
              borderRadius={look === "list" ? radius.pill : radius.sm}
            />
          )}
        </XStack>
      </XStack>
      {(item.badge || item.sub) && (
        <YStack gap={space.xs} paddingLeft={reserveIcon ? component.base.optionLead : component.base.none}>
          {item.badge && <SkeletonText text={item.badge} role="caption" />}
          {item.sub && <SkeletonText text={item.sub} role="caption" />}
        </YStack>
      )}
    </YStack>
  );
}

export function SkeletonOptions({ items = [], question, look = "cards" }: ShapeProps) {
  const reserveIcon = items.some((item) => item.icon !== undefined);
  return (
    <YStack accessibilityLabel={loadingLabel} aria-busy gap={space.sm}>
      {question && <SkeletonText text={question} role="heading" />}
      {items.map((item, index) => (
        <SkeletonOption key={index} item={item} look={look} reserveIcon={reserveIcon} />
      ))}
    </YStack>
  );
}

export function SkeletonControl({ label, kind = "primary", full = false }: ShapeProps) {
  const ks = useKitStyle();
  return (
    <YStack
      accessibilityLabel={loadingLabel}
      aria-busy
      minHeight={size.control.md}
      minWidth={size.control.md}
      paddingHorizontal={label ? space.lg : space.xs}
      alignSelf={full ? "stretch" : "flex-start"}
      justifyContent="center"
      alignItems="center"
      backgroundColor={kind === "quiet" ? "transparent" : "$line"}
      borderRadius={label ? shifted("md", ks.radiusShift) : radius.pill}
      {...(kind === "danger" ? { borderWidth: component.base.borderWidth, borderColor: "$line" } : {})}
    >
      {label && (
        <YStack position="relative" aria-hidden>
          <YStack opacity={component.base.none}>
            <KitText role="label" part={null}>
              {label}
            </KitText>
          </YStack>
          {kind === "quiet" && (
            <Bar
              position="absolute"
              width="100%"
              height={typography.label.size * 0.6}
              alignSelf="center"
              top={(typography.label.lineHeight - typography.label.size * 0.6) / 2}
            />
          )}
        </YStack>
      )}
      {!label && kind === "quiet" && <Bar width={size.icon.md} height={size.icon.md} />}
    </YStack>
  );
}
