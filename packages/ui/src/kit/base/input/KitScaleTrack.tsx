import { useKit } from "../../provider";
import { Angry, Frown, Laugh, Meh, Smile, Star } from "@tamagui/lucide-icons";
import { XStack, YStack, isWeb } from "tamagui";
import { component, radius, size, space } from "../../../catalog";
import { useComponentState, usePart } from "../../part";

const faces = [Angry, Frown, Meh, Smile, Laugh] as const;

function HalfStar({ fill, compact = false }: { fill: number; compact?: boolean }) {
  const icon = compact ? size.icon.sm : size.icon.lg;
  return (
    <YStack width={icon} height={icon} aria-hidden>
      <Star size={icon} color="$muted" fill="none" />
      {fill > 0 && (
        <YStack position="absolute" top={0} left={0} width={`${fill * 100}%`} overflow="hidden">
          <Star size={icon} color="$accent" fill="currentColor" />
        </YStack>
      )}
    </YStack>
  );
}

type LevelProps = {
  level: number;
  style: "mood" | "stars" | "dots";
  value: number;
  label: string;
  readonly: boolean;
};

function LevelMark({ level, style, value, readonly }: LevelProps) {
  const filled = style === "mood" ? level === value : level <= value;
  const tone = filled ? "$accent" : "$muted";
  const Face = faces[level - 1]!;
  return style === "dots" ? (
    <YStack
      width={size.icon.md}
      height={size.icon.md}
      borderRadius={radius.pill}
      borderWidth={component.base.strongBorder}
      borderColor={filled ? "$accent" : "$muted"}
      backgroundColor={filled ? "$accent" : "transparent"}
      aria-hidden
    />
  ) : style === "stars" && readonly ? (
    <HalfStar fill={Math.min(1, Math.max(0, value - (level - 1)))} />
  ) : style === "stars" ? (
    <Star size={size.icon.lg} color={tone} fill={filled ? "currentColor" : "none"} aria-hidden />
  ) : (
    <Face size={size.icon.lg} color={tone} aria-hidden />
  );
}

function Level({ level, style, value, label, readonly }: LevelProps) {
  const target = usePart(`l${level}`, !readonly);
  const kit = useKit();
  return (
    <YStack
      {...(readonly ? {} : target)}
      {...(!readonly && kit.interactive && kit.controller
        ? { onPress: () => kit.controller!.press(target.testID) }
        : {})}
      {...(!isWeb && !readonly && kit.interactive && kit.controller
        ? ({
            accessibilityActions: [{ name: "increment" }, { name: "decrement" }],
            onAccessibilityAction: (event: { nativeEvent: { actionName: string } }) => {
              const next = Math.min(
                5,
                Math.max(1, value + (event.nativeEvent.actionName === "increment" ? 1 : -1)),
              );
              kit.controller!.act({
                address: target.testID.replace(/l[1-5]$/, `l${next}`),
                action: "select",
                value: next,
              });
            },
          } as object)
        : {})}
      flex={1}
      minWidth={size.control.md}
      height={size.control.md}
      alignItems="center"
      justifyContent="center"
      {...(readonly
        ? { "aria-hidden": true }
        : {
            accessibilityRole: "radio" as const,
            "aria-checked": level === value,
            accessibilityLabel: label,
          })}
    >
      <LevelMark level={level} style={style} value={value} label={label} readonly={readonly} />
    </YStack>
  );
}

function SingleMood({ value, labels, part }: Pick<ScaleProps, "value" | "labels" | "part">) {
  const loading = useComponentState() === "loading";
  const Face = Number.isInteger(value) ? faces[value - 1] : undefined;
  const label = Face && !loading ? labels[value - 1] : undefined;
  const addressed = label !== undefined && part != null;
  const address = usePart(part ?? "root", addressed);
  return (
    <YStack
      {...(addressed ? address : {})}
      alignSelf="flex-start"
      width={size.icon.lg}
      height={size.icon.lg}
      borderRadius={radius.pill}
      backgroundColor={loading ? "$line" : undefined}
      accessibilityRole={label === undefined ? undefined : "image"}
      accessibilityLabel={label}
      aria-hidden={label === undefined || undefined}
    >
      {Face && !loading && <Face size={size.icon.lg} color="$accent" aria-hidden />}
    </YStack>
  );
}

type ScaleProps = {
  style: "mood" | "stars" | "dots";
  value: number;
  labels: readonly [string, string, string, string, string];
  /** A rating that is only shown: no targets, one image named by the value. */
  readonly?: boolean;
  /** Readonly stars only: intrinsic-width small icons, without the control-sized cells. */
  compact?: boolean;
  /** Readonly mood only: show just the supplied value's face. */
  single?: boolean;
  /** Readable part for the single face; omit or pass null to leave it unaddressed. */
  part?: string | null | undefined;
};

/**
 * Five equal 44px targets for a 1 to 5 level, the component parts `l1`..`l5`, each a radio named by
 * `labels`. `stars` and `dots` fill in accent up to `value`; `mood` shows five faces (angry to laughing)
 * with only the chosen one in accent. `value` 0 means not set.
 */
export function KitScaleTrack({
  style,
  value,
  labels,
  readonly = false,
  compact = false,
  single = false,
  part,
}: ScaleProps) {
  if (single && readonly && style === "mood") return <SingleMood value={value} labels={labels} part={part} />;
  const small = readonly && style === "stars" && compact;
  return (
    <XStack
      {...(readonly
        ? { accessibilityRole: "image" as const, accessibilityLabel: `${value} ${labels[4].slice(2)}` }
        : { accessibilityRole: "radiogroup" as const })}
      justifyContent="space-between"
      {...(small ? { alignSelf: "flex-start" as const, gap: space.xs } : {})}
    >
      {labels.map((label, index) =>
        small ? (
          <HalfStar key={label} fill={Math.min(1, Math.max(0, value - index))} compact />
        ) : (
          <Level
            key={label}
            level={index + 1}
            style={style}
            value={value}
            label={label}
            readonly={readonly}
          />
        ),
      )}
    </XStack>
  );
}
