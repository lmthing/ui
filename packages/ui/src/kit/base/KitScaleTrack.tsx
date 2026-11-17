import { Angry, Frown, Laugh, Meh, Smile, Star } from "@tamagui/lucide-icons";
import { XStack, YStack } from "tamagui";
import { component, radius, size } from "../../catalog";
import { usePart } from "../part";

const faces = [Angry, Frown, Meh, Smile, Laugh] as const;

function Level({
  level,
  style,
  value,
  label,
}: {
  level: number;
  style: "mood" | "stars" | "dots";
  value: number;
  label: string;
}) {
  const filled = style === "mood" ? level === value : level <= value;
  const tone = filled ? "$accent" : "$muted";
  const Face = faces[level - 1]!;
  return (
    <YStack
      {...usePart(`l${level}`)}
      flex={1}
      minWidth={size.control.md}
      height={size.control.md}
      alignItems="center"
      justifyContent="center"
      accessibilityRole="radio"
      aria-checked={level === value}
      accessibilityLabel={label}
    >
      {style === "dots" ? (
        <YStack
          width={size.icon.md}
          height={size.icon.md}
          borderRadius={radius.pill}
          borderWidth={component.base.strongBorder}
          borderColor={filled ? "$accent" : "$muted"}
          backgroundColor={filled ? "$accent" : "transparent"}
          aria-hidden
        />
      ) : style === "stars" ? (
        <Star size={size.icon.lg} color={tone} fill={filled ? "currentColor" : "none"} aria-hidden />
      ) : (
        <Face size={size.icon.lg} color={tone} aria-hidden />
      )}
    </YStack>
  );
}

/**
 * Five equal 44px targets for a 1 to 5 level, the component parts `l1`..`l5`, each a radio named by
 * `labels`. `stars` and `dots` fill in accent up to `value`; `mood` shows five faces (angry to laughing)
 * with only the chosen one in accent. `value` 0 means not set.
 */
export function KitScaleTrack({
  style,
  value,
  labels,
}: {
  style: "mood" | "stars" | "dots";
  value: number;
  labels: readonly [string, string, string, string, string];
}) {
  return (
    <XStack accessibilityRole="radiogroup" justifyContent="space-between">
      {labels.map((label, index) => (
        <Level key={label} level={index + 1} style={style} value={value} label={label} />
      ))}
    </XStack>
  );
}
