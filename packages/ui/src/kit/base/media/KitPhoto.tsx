import { useContext } from "react";
import { YStack, styled } from "tamagui";
import { component, radius, size, variants, type AxisValue, type ContentBleed } from "../../../catalog";
import { useKitStyle } from "../../provider";
import { usePart } from "../../part";
import { EdgeMediaContext, KitText, shifted } from "../text";
import { PhotoLayer, usePhotoLayer } from "./photo-layer";

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
  /** Edge media lets its enclosing frame own the outer corners. */
  bleed?: ContentBleed;
  part?: string | null;
  label?: string;
  initials?: string | undefined;
  ring?: "none" | "accent" | "muted";
  loading?: boolean;
};

/**
 * A photo by reference (`lib:<tag>` or `local:<n>`), resolved by the host. `thumb` and `round` sit
 * beside text; `wide` fills the width at 16:9 for a hero or card image. A tinted block until loaded.
 */
export function KitPhoto(props: PhotoProps) {
  const { photo, shape: fallbackShape = "thumb", aspect = "auto", part = "icon" } = props;
  const { label, initials, ring = "none", loading = false } = props;
  const inheritedBleed = useContext(EdgeMediaContext);
  const edge = props.bleed === undefined ? inheritedBleed : props.bleed === "edge";
  const { layer } = usePhotoLayer(loading ? undefined : photo);
  const ks = useKitStyle();
  const addressed = part !== null;
  const address = usePart(part ?? undefined, addressed);
  const shape =
    aspect !== "auto"
      ? aspect
      : !photo && !edge && !loading && fallbackShape !== "avatar"
        ? "round"
        : fallbackShape;
  const circle = shape === "round" || shape === "avatar";
  const corners =
    edge && shape !== "thumb"
      ? component.base.none
      : shifted(shape === "thumb" ? "sm" : "lg", ks.radiusShift);
  return (
    <Frame
      {...(addressed ? address : {})}
      shape={shape}
      {...(loading ? { backgroundColor: "$line" } : !layer ? { backgroundColor: "$raised" } : {})}
      {...(circle ? {} : { borderRadius: corners })}
      aria-hidden={loading || undefined}
      accessibilityRole={loading ? undefined : "image"}
      accessibilityLabel={
        loading ? undefined : (label ?? photo?.replace(/^lib:/, "").replace(/_/g, " ") ?? initials)
      }
      {...(ring !== "none"
        ? {
            borderWidth: component.base.strongBorder,
            borderColor: loading ? "$line" : ring === "accent" ? "$accent" : "$muted",
          }
        : {})}
      alignItems="center"
      justifyContent="center"
    >
      {!loading && !layer && initials && (
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
      {layer && <PhotoLayer {...layer} />}
    </Frame>
  );
}
