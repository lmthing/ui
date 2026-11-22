import { XStack, YStack, isWeb } from "tamagui";
import { clockLine, radius, size, space } from "../../../catalog";
import { useAnimatedValue } from "../../motion";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit, useWords } from "../../provider";
import { KitIcon, KitText } from "../text";
import { useMicCapture } from "./use-mic-capture";

type MicProps = {
  part?: string;
  loading?: boolean;
  label: string;
  recording: boolean;
  level: number;
  elapsedSeconds?: number;
  disabled?: boolean;
  target: { item?: string; part: string };
  style?: "hold" | "toggle";
};
const ratioOf = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);

function LevelBar({ level, settled, loading }: { level: number; settled: boolean; loading: boolean }) {
  const ratio = ratioOf(level);
  const animated = useAnimatedValue(ratio, settled);
  return (
    <XStack
      flex={1}
      height={space.sm}
      borderRadius={radius.pill}
      backgroundColor="$line"
      overflow="hidden"
      aria-hidden
    >
      {!loading && (
        <XStack
          width={`${ratioOf(settled ? ratio : animated) * 100}%`}
          height="100%"
          borderRadius={radius.pill}
          backgroundColor="$accent"
        />
      )}
    </XStack>
  );
}

function MicMark({
  loading,
  listening,
  enabled,
}: {
  loading: boolean;
  listening: boolean;
  enabled: boolean;
}) {
  return (
    <YStack
      width={size.control.md}
      height={size.control.md}
      alignItems="center"
      justifyContent="center"
      borderRadius={radius.pill}
      backgroundColor={loading ? "$line" : listening ? "$accentSoft" : "$raised"}
      aria-hidden
    >
      {!loading && (
        <KitIcon
          name={listening ? "square" : "mic"}
          decorative
          tone={listening ? "accent" : enabled ? "text" : "muted"}
        />
      )}
    </YStack>
  );
}

function MicButton({
  target,
  disabled = false,
  loading = false,
  label,
  elapsedSeconds,
  recording,
  level,
  style = "toggle",
}: MicProps) {
  const address = usePart(target.part, !loading);
  const { events, phase, enabled, unavailable } = useMicCapture(address.testID, disabled || loading, style);
  const listening = !loading && !unavailable && (recording || phase === "recording");
  const pending = phase === "pending";
  return (
    <YStack gap={space.sm}>
      <XStack
        {...(loading
          ? { "aria-hidden": true }
          : { ...address, accessibilityRole: "button", accessibilityLabel: label })}
        aria-disabled={!enabled || undefined}
        aria-pressed={loading ? undefined : listening}
        aria-busy={pending || undefined}
        {...(!isWeb
          ? {
              accessible: !loading,
              accessibilityState: { disabled: !enabled, selected: listening, busy: pending },
            }
          : {})}
        focusable={enabled}
        cursor={enabled ? "pointer" : undefined}
        {...events}
        gap={space.sm}
        alignItems="center"
        minHeight={size.control.md}
      >
        <MicMark {...{ loading, listening, enabled }} />
        {loading ? (
          <YStack width="40%" height={space.sm} borderRadius={radius.pill} backgroundColor="$line" />
        ) : (
          <KitText part={null} role="label" tone={disabled || unavailable ? "muted" : "text"}>
            {label}
          </KitText>
        )}
      </XStack>
      <MicReading {...{ level, loading, listening, unavailable, disabled }} elapsedSeconds={elapsedSeconds} />
    </YStack>
  );
}

function MicReading({
  level,
  loading,
  listening,
  unavailable,
  disabled,
  elapsedSeconds,
}: {
  level: number;
  loading: boolean;
  listening: boolean;
  unavailable: boolean;
  disabled: boolean;
  elapsedSeconds: number | undefined;
}) {
  const { environment, motion } = useKit();
  const { lang, words } = useWords();
  const time =
    elapsedSeconds !== undefined && Number.isFinite(elapsedSeconds)
      ? clockLine(elapsedSeconds, lang)
      : undefined;
  const settled =
    environment.reduceMotion || environment.agentMode || motion === "calm" || !listening || disabled;
  const offline = !loading && unavailable;
  return (
    <XStack
      gap={space.sm}
      alignItems="center"
      minHeight={offline ? undefined : size.icon.md}
      justifyContent={offline ? "space-between" : undefined}
    >
      {offline ? (
        <KitText part={null} role="caption" tone="muted">
          {words.mediaUnavailable}
        </KitText>
      ) : (
        <LevelBar level={listening ? level : 0} {...{ settled, loading }} />
      )}
      {!loading && time !== undefined && (
        <KitText part={null} role="caption" tabular tone={listening ? "accent" : "muted"}>
          {time}
        </KitText>
      )}
    </XStack>
  );
}
/** An ok-tier host capture; props carry the sampled level and elapsed clock, not audio. */
export function KitMicCapture({ part = "root", ...props }: MicProps) {
  const context = usePartContext();
  const item = props.target.item ?? context.item;
  const addressed = Boolean(props.loading || part !== props.target.part || item !== context.item);
  const address = usePart(part, addressed);
  return (
    <YStack {...(addressed ? address : {})} aria-busy={props.loading || undefined}>
      <PartContext.Provider value={{ ...context, ...(item === undefined ? {} : { item }) }}>
        <MicButton {...props} />
      </PartContext.Provider>
    </YStack>
  );
}
