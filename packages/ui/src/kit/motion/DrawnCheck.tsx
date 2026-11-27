import { Path, Circle, Svg } from "react-native-svg";
import { YStack, useTheme } from "tamagui";
import { motionProfiles, variants } from "../../catalog";
import { useChangeReveal, useReducedFade } from "./use-change-reveal";
import { useReveal } from "./use-motion";
import { useKit } from "../provider";

const check = { d: "m5 12 4 4L19 6", length: 19.8 };
const circled = { d: "m8 12 3 3 5-6", length: 12.06 };

export function DrawnCheck({
  size,
  tone,
  active = true,
  ring = false,
  complete = false,
}: {
  size: number;
  tone: string;
  active?: boolean;
  ring?: boolean;
  complete?: boolean;
}) {
  const { motion, environment } = useKit();
  const theme = useTheme();
  const play = active && !environment.agentMode && !environment.reduceMotion;
  const profile = motionProfiles[motion];
  const arrival = useReveal(1, complete && play, { duration: profile.navigation });
  const change = useChangeReveal(!complete && active ? "checked" : undefined, false);
  const fade = useReducedFade(active ? "checked" : undefined);
  const progress = play ? arrival * change : 1;
  if (!active) return null;
  const color = theme[tone]?.val;
  const pulse = complete && motion === "lively" ? Math.sin(progress * Math.PI) : 0;
  const { d, length } = ring ? circled : check;
  return (
    <YStack pointerEvents="none" scale={1 + pulse * variants.motion[motion].pulseScale} aria-hidden {...fade}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {ring && <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />}
        <Path
          d={d}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          {...(progress < 1
            ? { strokeDasharray: [length, length], strokeDashoffset: length * (1 - progress) }
            : {})}
        />
      </Svg>
    </YStack>
  );
}
