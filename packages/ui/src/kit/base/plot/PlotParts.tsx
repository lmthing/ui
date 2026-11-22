import { YStack } from "tamagui";
import { component, type as typography } from "../../../catalog";
import { useKitStyle } from "../../provider";
import { KitText, shifted, type TextRole, type TextTone } from "../text";

export function PlotLabel({
  label,
  loading,
  role = "label",
  tone = "muted",
  align = "start",
}: {
  label?: string;
  loading?: boolean;
  role?: TextRole;
  tone?: TextTone;
  align?: "start" | "center" | "end";
}) {
  const ks = useKitStyle();
  return (
    <YStack
      position="relative"
      alignSelf={align === "end" ? "flex-end" : align === "center" ? "center" : "flex-start"}
      maxWidth="100%"
    >
      <YStack
        opacity={loading ? component.base.none : 1}
        {...(loading ? { visibility: "hidden" as const } : {})}
      >
        <KitText role={role} tone={tone} part={null} tabular>
          {label}
        </KitText>
      </YStack>
      {loading && (
        <YStack
          position="absolute"
          top={(typography[role].lineHeight - typography[role].size * 0.6) / 2}
          height={typography[role].size * 0.6}
          width="100%"
          backgroundColor="$line"
          borderRadius={shifted("sm", ks.radiusShift)}
          aria-hidden
        />
      )}
    </YStack>
  );
}
