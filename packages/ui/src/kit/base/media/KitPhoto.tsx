import { useContext, type ReactNode } from "react";
import { YStack, isWeb, styled } from "tamagui";
import {
  component,
  radius,
  size,
  variants,
  type AxisValue,
  type ContentBleed,
  type PhotoInput,
} from "../../../catalog";
import { useKitStyle } from "../../provider";
import { usePart } from "../../part";
import { EdgeMediaContext, KitText, shifted } from "../text";
import { PhotoLayer, useAddressedPhotoLayer } from "./photo-layer";

const Frame = styled(YStack, {
  overflow: "hidden",
  position: "relative",
  backgroundColor: "$accentSoft",
  variants: {
    shape: {
      thumb: { width: size.avatar.md, height: size.avatar.md },
      round: { width: size.avatar.md, height: size.avatar.md, borderRadius: radius.pill },
      wide: { width: "100%", aspectRatio: variants.aspect.wide },
      panorama: { width: "100%", aspectRatio: component.base.panoramaRatio },
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
  photo?: PhotoInput | undefined;
  shape?: "thumb" | "round" | "wide" | "panorama" | "square" | "tall" | "avatar";
  /** `auto` keeps the caller's usual shape; explicit ratios stay in place even without a photo. */
  aspect?: AxisValue<"aspect">;
  /** Edge media lets its enclosing frame own the outer corners. */
  bleed?: ContentBleed;
  part?: string | null;
  label?: string;
  initials?: string | undefined;
  /** When the adjacent title already names the item, the image or its monogram is decorative. */
  decorative?: boolean;
  ring?: "none" | "accent" | "muted";
  loading?: boolean;
  /** Replace the image frame on decode/load failure. Thumbnails keep their normal fallback. */
  error?: ReactNode;
  /** Content after the frame, but never after an image error. */
  caption?: ReactNode;
};

function PhotoInitials({
  value,
  avatar,
  decorative,
  hasPhoto,
}: {
  value: string;
  avatar: boolean;
  decorative: boolean;
  hasPhoto: boolean;
}) {
  const painted = decorative && isWeb;
  const text = (
    <KitText role={avatar ? "heading" : "label"} tone="text" align="center" part={null} lines={1}>
      {painted ? <span data-kit-photo-initial={value} /> : value}
    </KitText>
  );
  return decorative || hasPhoto ? (
    <YStack aria-hidden accessibilityElementsHidden>
      {/* React hoists the shared rule out of the row. The glyph isn't a DOM text node. */}
      {painted && (
        <style href="kit-photo-initial" precedence="default">
          {"[data-kit-photo-initial]::before { content: attr(data-kit-photo-initial); }"}
        </style>
      )}
      {text}
    </YStack>
  ) : (
    text
  );
}

function ringOf(ring: NonNullable<PhotoProps["ring"]>, loading: boolean) {
  if (ring === "none") return {};
  return {
    borderWidth: component.base.strongBorder,
    borderColor: loading ? "$line" : ring === "accent" ? "$accent" : "$muted",
  } as const;
}

/**
 * A photo by reference (`lib:<tag>` or `local:<n>`), resolved by the host. `thumb` and `round` sit
 * beside text; `wide` fills the width at 16:9 for a hero or card image. A tinted block until loaded.
 */
export function KitPhoto(props: PhotoProps) {
  const { photo, shape: fallbackShape = "thumb", aspect = "auto", part = "icon" } = props;
  const { label, initials, ring = "none", loading = false, decorative = false } = props;
  const inheritedBleed = useContext(EdgeMediaContext);
  const edge = props.bleed === undefined ? inheritedBleed : props.bleed === "edge";
  const { layer, failed } = useAddressedPhotoLayer(loading ? undefined : photo, part);
  const ks = useKitStyle();
  const address = usePart(part ?? undefined, part !== null);
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
  if (failed && props.error !== undefined) return props.error;
  const frame = (
    <Frame
      {...(part !== null ? address : {})}
      data-kit-photo={isWeb && layer ? "" : undefined}
      shape={shape}
      {...(loading
        ? { backgroundColor: "$line" }
        : !layer && typeof photo !== "object"
          ? { backgroundColor: "$raised" }
          : {})}
      {...(circle ? {} : { borderRadius: corners })}
      aria-hidden={loading || decorative || undefined}
      accessibilityElementsHidden={decorative || undefined}
      importantForAccessibility={decorative && !isWeb ? "no-hide-descendants" : undefined}
      accessibilityRole={loading || decorative ? undefined : "image"}
      accessibilityLabel={
        loading || decorative
          ? undefined
          : typeof photo === "object"
            ? photo.subject
            : (label ?? photo?.replace(/^lib:/, "").replace(/_/g, " ") ?? initials)
      }
      {...ringOf(ring, loading)}
      alignItems="center"
      justifyContent="center"
    >
      {!loading && !layer && initials && (!photo || circle || decorative) && (
        <PhotoInitials
          value={initials}
          avatar={shape === "avatar"}
          decorative={decorative}
          hasPhoto={Boolean(photo)}
        />
      )}
      {layer && <PhotoLayer {...layer} />}
    </Frame>
  );
  return props.caption ? (
    <>
      {frame}
      {props.caption}
    </>
  ) : (
    frame
  );
}
