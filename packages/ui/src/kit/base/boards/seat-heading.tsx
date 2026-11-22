import { YStack } from "tamagui";
import { radius, size, space, type as typography } from "../../../catalog";
import { KitText } from "../text";

export function SeatHeading({
  label,
  loading,
  screen = false,
}: {
  label: string;
  loading: boolean;
  screen?: boolean;
}) {
  return (
    <YStack
      minHeight={screen ? size.control.sm : typography.label.lineHeight}
      paddingHorizontal={screen ? space.md : undefined}
      alignItems={screen ? "center" : "flex-start"}
      justifyContent="center"
      borderRadius={screen ? radius.pill : undefined}
      backgroundColor={screen ? "$raised" : undefined}
      aria-hidden={loading || undefined}
    >
      {loading ? (
        <YStack
          width={size.control.lg}
          height={space.sm}
          borderRadius={radius.pill}
          backgroundColor="$line"
        />
      ) : (
        <KitText part={null} role="label" lines={1} tone={screen ? "muted" : "text"}>
          {label}
        </KitText>
      )}
    </YStack>
  );
}
