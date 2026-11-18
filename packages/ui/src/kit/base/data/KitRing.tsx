import { useSignatureProgress } from "../../motion";
import type { ReactNode } from "react";
import { Svg, Circle } from "react-native-svg";
import { YStack, useTheme } from "tamagui";
import { component, space } from "../../../catalog";
import { usePart } from "../../part";

const sizes = { md: component.base.ringMd, lg: component.base.ringLg } as const;

/**
 * Progress to one goal: a round track in `$line` with an `$accent` arc filled to `value / of`, starting
 * at twelve o'clock. Children (the number) sit centred inside. The ring is the part (default `ring`);
 * the drawing is hidden from assistive tech, so the text inside carries the meaning.
 */
export function KitRing({
  value,
  of,
  scale = "md",
  part = "ring",
  children,
}: {
  value: number;
  of: number;
  scale?: "md" | "lg";
  part?: string;
  children?: ReactNode;
}) {
  const theme = useTheme();
  const progress = useSignatureProgress("ring_fill");
  const box = sizes[scale];
  const stroke = scale === "lg" ? space.md : space.sm + space.xs / 2;
  const r = (box - stroke) / 2;
  const length = 2 * Math.PI * r;
  const share = of > 0 ? Math.min(1, Math.max(0, value / of)) : 0;
  return (
    <YStack
      {...usePart(part)}
      width={box}
      height={box}
      alignSelf="center"
      alignItems="center"
      justifyContent="center"
    >
      <YStack position="absolute" top={0} left={0} aria-hidden accessibilityElementsHidden>
        <Svg width={box} height={box}>
          <Circle cx={box / 2} cy={box / 2} r={r} stroke={theme.line?.val} strokeWidth={stroke} fill="none" />
          <Circle
            cx={box / 2}
            cy={box / 2}
            r={r}
            stroke={theme.accent?.val}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${length * share * progress} ${length}`}
            transform={`rotate(-90 ${box / 2} ${box / 2})`}
          />
        </Svg>
      </YStack>
      {children}
    </YStack>
  );
}
