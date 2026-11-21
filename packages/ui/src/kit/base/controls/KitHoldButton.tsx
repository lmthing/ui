import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Circle, Svg } from "react-native-svg";
import { YStack, isWeb, useTheme } from "tamagui";
import { component, radius, space } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit } from "../../provider";
import { KitText } from "../text";
import { useContinuousPress } from "./use-continuous-press";

type HoldProps = {
  part?: string;
  loading?: boolean;
  label: string;
  progress: number;
  holding: boolean;
  armedLabel?: string;
  disabled?: boolean;
  target: { item?: string; part: string };
};
const holdMs = 3000;
const box = component.base.ringLg;
const stroke = space.sm;
const middle = box / 2;
const ring = (box - stroke) / 2;
const length = 2 * Math.PI * ring;
const ratioOf = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);

function Countdown({ ratio, disabled }: { ratio: number; disabled: boolean }) {
  const theme = useTheme();
  return (
    <YStack position="absolute" top={0} left={0} pointerEvents="none" aria-hidden accessibilityElementsHidden>
      <Svg width={box} height={box}>
        <Circle cx={middle} cy={middle} r={ring} fill="none" stroke={theme.line?.val} strokeWidth={stroke} />
        {ratio > 0 && (
          <Circle
            cx={middle}
            cy={middle}
            r={ring}
            fill="none"
            stroke={disabled ? theme.muted?.val : theme.accent?.val}
            strokeWidth={stroke}
            strokeDasharray={`${length * ratio} ${length}`}
            transform={`rotate(-90 ${middle} ${middle})`}
          />
        )}
      </Svg>
    </YStack>
  );
}

function useCountdown(enabled: boolean, address: string) {
  const { controller, environment, motion, interactive } = useKit();
  const [local, setLocal] = useState<number>();
  const frame = useRef<number | undefined>(undefined);
  const start = useRef<number | undefined>(undefined);
  const complete = useRef<(() => unknown) | undefined>(undefined);
  useLayoutEffect(() => {
    if (!controller || !interactive) return;
    const hold = controller.registerHoldPart(address);
    complete.current = hold.complete;
    return () => {
      hold.unregister();
      complete.current = undefined;
    };
  }, [address, controller, interactive]);
  const finish = () => {
    if (start.current === undefined) return;
    start.current = undefined;
    complete.current?.();
  };
  const settled = environment.reduceMotion || environment.agentMode || motion === "calm";
  const events = useContinuousPress(enabled, controller, address, {
    begin(began) {
      start.current = began;
      const step = (at: number) => {
        const ratio = ratioOf((at - began) / holdMs);
        if (ratio < 1) {
          setLocal(settled ? Math.floor(ratio * (holdMs / 1000)) / (holdMs / 1000) : ratio);
          frame.current = requestAnimationFrame(step);
          return;
        }
        frame.current = undefined;
        setLocal(1);
        finish();
      };
      setLocal(0);
      frame.current = requestAnimationFrame(step);
    },
    end(releasedAt) {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
      frame.current = undefined;
      if (releasedAt !== undefined && start.current !== undefined && releasedAt - start.current >= holdMs)
        finish();
      start.current = undefined;
      setLocal(undefined);
    },
  });
  return { local, events };
}

function HoldFace({ target, label, armedLabel, progress, holding, disabled, loading }: HoldProps) {
  const { interactive, controller } = useKit();
  const address = usePart(target.part, !loading);
  const blocked =
    disabled ||
    (interactive &&
      controller &&
      !controller.actionsAt(address.testID, { ignoreDisabledPart: true }).includes("press"));
  const enabled = Boolean(interactive && controller && !blocked && !loading);
  const { local, events } = useCountdown(enabled, address.testID);
  useEffect(
    () => (disabled || loading ? controller?.registerDisabledPart(address.testID) : undefined),
    [controller, address.testID, disabled, loading],
  );
  const ratio = loading ? 0 : (local ?? ratioOf(progress));
  const caption = ratio === 1 ? (armedLabel ?? label) : label;
  return (
    <YStack
      {...(loading ? { "aria-hidden": true } : { ...address, accessibilityRole: "button" })}
      accessibilityLabel={loading ? undefined : caption}
      aria-disabled={blocked || undefined}
      {...(!isWeb ? { accessible: !loading, accessibilityState: { disabled: Boolean(blocked) } } : {})}
      focusable={enabled}
      cursor={enabled ? "pointer" : undefined}
      {...events}
      width={box}
      height={box}
      alignSelf="center"
      alignItems="center"
      justifyContent="center"
      borderRadius={radius.pill}
      backgroundColor={
        loading || blocked
          ? "$raised"
          : holding || local !== undefined || ratio === 1
            ? "$accentSoft"
            : "$surface"
      }
      padding={space.lg}
    >
      <Countdown ratio={ratio} disabled={Boolean(blocked)} />
      {loading ? (
        <YStack width="55%" height={space.sm} borderRadius={radius.pill} backgroundColor="$line" />
      ) : (
        <KitText part={null} role="label" align="center" lines={2} tone={blocked ? "muted" : "text"}>
          {caption}
        </KitText>
      )}
    </YStack>
  );
}

/** Supplied progress is a drawing input, never proof that the user completed the gesture. */
export function KitHoldButton({ part = "root", ...props }: HoldProps) {
  const context = usePartContext();
  const item = props.target.item ?? context.item;
  const same = part === props.target.part && item === context.item;
  const addressed = Boolean(props.loading || !same);
  const address = usePart(part, addressed);
  return (
    <YStack {...(addressed ? address : {})} aria-busy={props.loading || undefined}>
      <PartContext.Provider value={{ ...context, ...(item === undefined ? {} : { item }) }}>
        <HoldFace {...props} />
      </PartContext.Provider>
    </YStack>
  );
}
