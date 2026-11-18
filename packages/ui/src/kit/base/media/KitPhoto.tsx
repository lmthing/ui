import { Image, YStack, styled } from "tamagui";
import { component, radius, size } from "../../../catalog";
import { useKit, useKitStyle } from "../../provider";
import { usePart } from "../../part";
import { shifted } from "../text";

const Frame = styled(YStack, {
  overflow: "hidden",
  position: "relative",
  backgroundColor: "$accentSoft",
  variants: {
    shape: {
      thumb: { width: size.avatar.md, height: size.avatar.md },
      round: { width: size.avatar.md, height: size.avatar.md, borderRadius: radius.pill },
      wide: { width: "100%", aspectRatio: component.base.wideRatio },
      square: { width: "100%", aspectRatio: 1 },
      tall: { width: "100%", aspectRatio: component.base.tallRatio },
      avatar: {
        width: size.avatar.lg,
        height: size.avatar.lg,
        borderRadius: radius.pill,
        alignSelf: "center",
      },
    },
  } as const,
});

/**
 * A photo by reference (`lib:<tag>` or `local:<n>`), resolved by the host. `thumb` and `round` sit
 * beside text; `wide` fills the width at 16:9 for a hero or card image. A tinted block until loaded.
 */
export function KitPhoto({
  photo,
  shape = "thumb",
  part = "icon",
  label,
}: {
  photo: string;
  shape?: "thumb" | "round" | "wide" | "square" | "tall" | "avatar";
  part?: string;
  label?: string;
}) {
  const source = useKit().resolvePhoto?.(photo);
  const ks = useKitStyle();
  return (
    <Frame
      {...usePart(part)}
      shape={shape}
      {...(shape === "round" || shape === "avatar"
        ? {}
        : { borderRadius: shifted(shape === "thumb" ? "sm" : "lg", ks.radiusShift) })}
      accessibilityRole="image"
      accessibilityLabel={label ?? photo.replace(/^lib:/, "").replace(/_/g, " ")}
    >
      {source && (
        <Image
          source={{ uri: source }}
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          width="100%"
          height="100%"
          objectFit="cover"
        />
      )}
    </Frame>
  );
}
