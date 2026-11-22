import { YStack } from "tamagui";
import { component, space } from "../../../catalog";
import { useKitStyle } from "../../provider";
import { shifted, tintOf } from "../text";

export function RowDecoration({ fade = false, fresh = false }: { fade?: boolean; fresh?: boolean }) {
  const ks = useKitStyle();
  const edge = fade ? component.base.none : component.base.borderWidth;
  const corner = shifted("md", ks.radiusShift);
  return (
    <YStack
      position="absolute"
      top={edge}
      right={edge}
      bottom={edge}
      left={edge}
      borderRadius={corner - edge}
      {...(fade
        ? { backgroundColor: "$raised", opacity: component.base.stackFade }
        : {
            borderWidth: fresh ? component.base.borderWidth : component.base.strongBorder,
            borderColor: "$accent",
          })}
      pointerEvents="none"
      aria-hidden
    />
  );
}

export function RowStatusRule({ tone }: { tone: "good" | "warn" | "bad" }) {
  return (
    <YStack
      position="absolute"
      left={space.xs}
      top={space.sm}
      bottom={space.sm}
      width={component.base.strongBorder}
      backgroundColor={tintOf(tone).borderColor}
      pointerEvents="none"
      aria-hidden
    />
  );
}
