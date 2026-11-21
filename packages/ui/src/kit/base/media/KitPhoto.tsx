import { Image, YStack, styled } from "tamagui";
import { component, radius, size, variants, type AxisValue } from "../../../catalog";
import { useKit, useKitStyle } from "../../provider";
import { usePart } from "../../part";
import { KitText, shifted } from "../text";

const Frame = styled(YStack, {
  overflow: "hidden",
  position: "relative",
  backgroundColor: "$accentSoft",
  variants: {
    shape: {
      thumb: { width: size.avatar.md, height: size.avatar.md },
      round: { width: size.avatar.md, height: size.avatar.md, borderRadius: radius.pill },
      wide: { width: "100%", aspectRatio: variants.aspect.wide },
      square: { width: "100%", aspectRatio: variants.aspect.square },
      tall: { width: "100%", aspectRatio: variants.aspect.tall },
      avatar: {
        width: size.avatar.lg,
        height: size.avatar.lg,
        borderRadius: radius.pill,
        alignSelf: "center",
      },
    },
  } as const,
});

type PhotoProps = {
  photo?: string | undefined;
  shape?: "thumb" | "round" | "wide" | "square" | "tall" | "avatar";
  /** `auto` keeps the caller's usual shape; explicit ratios stay in place even without a photo. */
  aspect?: AxisValue<"aspect">;
  part?: string | null;
  label?: string;
  initials?: string | undefined;
  ring?: "none" | "accent" | "muted";
};

/**
 * A photo by reference (`lib:<tag>` or `local:<n>`), resolved by the host. `thumb` and `round` sit
 * beside text; `wide` fills the width at 16:9 for a hero or card image. A tinted block until loaded.
 */
export function KitPhoto(props: PhotoProps) {
  const { photo, shape: fallbackShape = "thumb", aspect = "auto", part = "icon" } = props;
  const { label, initials, ring = "none" } = props;
  const kit = useKit();
  const source = photo ? kit.resolvePhoto?.(photo) : undefined;
  const ks = useKitStyle();
  const address = usePart(part ?? undefined, part !== null);
  const shape = aspect !== "auto" ? aspect : !photo && fallbackShape !== "avatar" ? "round" : fallbackShape;
  const circle = shape === "round" || shape === "avatar";
  return (
    <Frame
      {...(part === null ? {} : address)}
      shape={shape}
      {...(!photo || !source ? { backgroundColor: "$raised" } : {})}
      {...(circle ? {} : { borderRadius: shifted(shape === "thumb" ? "sm" : "lg", ks.radiusShift) })}
      accessibilityRole="image"
      accessibilityLabel={label ?? photo?.replace(/^lib:/, "").replace(/_/g, " ") ?? initials}
      {...(ring !== "none"
        ? { borderWidth: component.base.strongBorder, borderColor: ring === "accent" ? "$accent" : "$muted" }
        : {})}
      {...(!photo ? { alignItems: "center", justifyContent: "center" } : {})}
    >
      {!photo && initials && (
        <KitText
          role={shape === "avatar" ? "heading" : "label"}
          tone="text"
          align="center"
          part={null}
          lines={1}
        >
          {initials}
        </KitText>
      )}
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
