import { Image } from "tamagui";
import { component } from "../../../catalog";

/** A decorative host image on a known rectangle, never an addressed control. */
export function PhotoLayer({
  source,
  width = "100%",
  stretch = false,
}: {
  source: string;
  width?: number | "100%";
  stretch?: boolean;
}) {
  return (
    <Image
      source={{ uri: source }}
      position="absolute"
      top={component.base.none}
      left={component.base.none}
      width={width}
      height="100%"
      objectFit={stretch ? "fill" : "cover"}
      resizeMode={stretch ? "stretch" : "cover"}
      pointerEvents="none"
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
