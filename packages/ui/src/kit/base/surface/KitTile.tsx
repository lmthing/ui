import { YStack, styled } from "tamagui";
import { size, space, type IconName } from "../../../catalog";
import { useKit, useKitStyle } from "../../provider";
import { PartContext, usePart, usePartContext } from "../../part";
import { KitIcon } from "../text";
import { KitText } from "../text";
import { shifted } from "../text";

const Badge = styled(YStack, {
  width: size.avatar.md,
  height: size.avatar.md,
  borderRadius: size.avatar.md,
  backgroundColor: "$accentSoft",
  alignItems: "center",
  justifyContent: "center",
});

function Tile({ icon, label, goto }: { icon: IconName; label: string; goto?: string | undefined }) {
  const kit = useKit();
  const ks = useKitStyle();
  const part = usePart();
  return (
    <YStack
      {...part}
      alignItems="center"
      gap={space.sm}
      paddingVertical={space.md}
      paddingHorizontal={space.sm}
      minHeight={size.control.lg}
      borderRadius={shifted("md", ks.radiusShift)}
      accessibilityRole={goto ? "link" : "button"}
      accessibilityLabel={label}
      {...(kit.interactive && goto ? { onPress: () => kit.onLink?.(goto, part.testID) } : {})}
    >
      <Badge>
        <KitIcon name={icon} tone="accent" scale="lg" />
      </Badge>
      <KitText role="label" align="center" part="label" lines={2}>
        {label}
      </KitText>
    </YStack>
  );
}

/**
 * One pressable item tile: an icon in a soft round badge over a centred label, the whole tile one
 * address (`<item>/root`, with `icon` and `label` parts). For quick-action grids (`Actions`).
 */
export function KitTile({
  item,
  ...props
}: {
  item: string;
  icon: IconName;
  label: string;
  goto?: string | undefined;
}) {
  const context = usePartContext();
  return (
    <PartContext.Provider value={{ ...context, item }}>
      <Tile {...props} />
    </PartContext.Provider>
  );
}
