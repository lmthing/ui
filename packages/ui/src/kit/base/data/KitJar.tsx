import type { ReactNode } from "react";
import { YStack } from "tamagui";
import { component, radius, space } from "../../../catalog";
import { usePart } from "../../part";
import { useKitStyle } from "../../provider";
import { shifted } from "../text";

type JarProps = {
  part?: string;
  loading?: boolean;
  ratio: number;
  label: string;
  children?: ReactNode;
};

/** A normalized, token-sized jar with a soft fill behind caller-supplied centred content. */
export function KitJar({ part = "root", loading = false, ratio, label, children }: JarProps) {
  const ks = useKitStyle();
  const fill = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
  return (
    <YStack
      {...usePart(part)}
      width={component.base.ringMd}
      alignSelf="center"
      alignItems="center"
      aria-label={loading ? undefined : label}
      aria-busy={loading || undefined}
    >
      <YStack
        width={component.base.ringMd - space.xl}
        height={space.sm}
        borderWidth={component.base.strongBorder}
        borderColor={loading ? "$line" : "$muted"}
        borderRadius={radius.sm}
        backgroundColor={loading ? "$line" : "$raised"}
        aria-hidden
      />
      <YStack
        width="100%"
        height={component.base.ringLg - space.sm}
        overflow="hidden"
        borderRadius={shifted("lg", ks.radiusShift)}
        borderWidth={component.base.strongBorder}
        borderColor={loading ? "$line" : "$muted"}
        backgroundColor="$surface"
      >
        <YStack
          position="absolute"
          bottom={component.base.none}
          width="100%"
          height={`${fill * 100}%`}
          backgroundColor={loading ? "$line" : "$accentSoft"}
          aria-hidden
        />
        <YStack
          flex={1}
          padding={space.md}
          justifyContent="center"
          alignItems="center"
          aria-hidden={loading || undefined}
          accessibilityElementsHidden={loading}
        >
          <YStack backgroundColor={loading ? "$line" : undefined} borderRadius={radius.sm}>
            <YStack {...(loading ? { visibility: "hidden" as const, inert: true } : {})}>{children}</YStack>
          </YStack>
        </YStack>
      </YStack>
    </YStack>
  );
}
