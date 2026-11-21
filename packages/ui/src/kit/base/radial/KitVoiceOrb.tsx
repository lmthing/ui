import type { ReactNode } from "react";
import { isWeb, YStack } from "tamagui";
import { component, radius, size, space, type IconName } from "../../../catalog";
import { useAnimatedValue } from "../../motion";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit } from "../../provider";
import { KitIcon, type TextTone } from "../text";

type OrbProps = {
  part?: string;
  loading?: boolean;
  state: "idle" | "listening" | "thinking" | "speaking";
  level: number;
  label: string;
  children?: ReactNode;
  target: { item?: string; part: string };
};

const box = component.base.ringLg + space.lg * 2;
const core = component.base.ringMd;
const states = {
  idle: { icon: "dot", tone: "muted", fill: "$raised", outline: "$line" },
  listening: { icon: "mic", tone: "accent", fill: "$accentSoft", outline: "$accent" },
  thinking: { icon: "clock", tone: "accent", fill: "$surface", outline: "$accent" },
  speaking: { icon: "activity", tone: "onAccent", fill: "$accent", outline: "$accent" },
} as const satisfies Record<
  OrbProps["state"],
  { icon: IconName; tone: TextTone; fill: string; outline: string }
>;

export function voiceLevel(state: OrbProps["state"], level: number) {
  return (state === "listening" || state === "speaking") && Number.isFinite(level)
    ? Math.min(1, Math.max(0, level))
    : 0;
}

function OrbDrawing({ children, loading, state, level }: OrbProps) {
  const { environment } = useKit();
  const ratio = voiceLevel(state, level);
  const settled = loading || environment.reduceMotion || environment.agentMode;
  const animated = useAnimatedValue(loading ? 0 : ratio, settled);
  const halo = core + space.md * 2 + space.xl * 2 * voiceLevel(state, settled ? ratio : animated);
  const look = states[state];
  return (
    <>
      <YStack
        position="absolute"
        width={loading ? box - space.sm : halo}
        height={loading ? box - space.sm : halo}
        borderRadius={radius.pill}
        borderWidth={component.base.strongBorder}
        borderColor={loading ? "$line" : look.outline}
        borderStyle={!loading && state === "thinking" ? "dashed" : "solid"}
        backgroundColor={!loading && state === "speaking" ? "$accentSoft" : undefined}
        pointerEvents="none"
        aria-hidden
      />
      <YStack
        width={core}
        height={core}
        borderRadius={radius.pill}
        alignItems="center"
        justifyContent="center"
        backgroundColor={loading ? "$line" : look.fill}
      >
        {!loading && (children ?? <KitIcon name={look.icon} tone={look.tone} scale="lg" decorative />)}
      </YStack>
    </>
  );
}

function OrbControl(props: OrbProps) {
  const kit = useKit();
  const address = usePart(props.target.part, !props.loading);
  const actionable = !props.loading && kit.interactive && kit.controller;
  const press = (event: { stopPropagation?(): void }) => {
    event.stopPropagation?.();
    return kit.controller?.press(address.testID);
  };
  return (
    <YStack
      {...(props.loading ? {} : address)}
      width={box}
      height={box}
      minWidth={size.control.md}
      alignSelf="center"
      alignItems="center"
      justifyContent="center"
      accessibilityRole={props.loading ? undefined : "button"}
      accessibilityLabel={props.loading ? undefined : props.label}
      aria-hidden={props.loading || undefined}
      {...(actionable
        ? {
            onPress: press,
            ...(isWeb
              ? {
                  cursor: "pointer" as const,
                  tabIndex: 0 as const,
                  onKeyDown: (event: { key: string; preventDefault(): void; stopPropagation(): void }) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    press(event);
                  },
                }
              : { accessible: true }),
          }
        : {})}
    >
      <OrbDrawing {...props} />
    </YStack>
  );
}

/** Muted sessions use idle with zero level and caller-supplied muted content and label. */
export function KitVoiceOrb({ part = "root", ...props }: OrbProps) {
  const scope = usePartContext();
  const item = props.target.item ?? scope.item;
  const separate = part !== props.target.part || item !== scope.item;
  const address = usePart(part, separate);
  return (
    <YStack {...(separate ? address : {})} aria-busy={props.loading || undefined}>
      <PartContext.Provider value={item === scope.item ? scope : { ...scope, item }}>
        <OrbControl {...props} />
      </PartContext.Provider>
    </YStack>
  );
}
