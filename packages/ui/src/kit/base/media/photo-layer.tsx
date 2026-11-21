import { useState } from "react";
import { Image } from "tamagui";
import { component } from "../../../catalog";
import { useKit } from "../../provider";

export type PhotoLayerSource = { source: string; onLoad: () => void; onError: () => void };
type Status = "pending" | "ready" | "failed";

/** A newly selected URI must load independently of the previous frame. */
export function usePhotoLayer(reference: string | undefined) {
  const { resolvePhoto } = useKit();
  const source = reference ? resolvePhoto?.(reference) : undefined;
  const [image, setImage] = useState<{ source: string | undefined; status: Status }>({
    source,
    status: "pending",
  });
  if (image.source !== source) setImage({ source, status: "pending" });
  const status = image.source === source ? image.status : "pending";
  const settle = (next: Status) =>
    setImage((current) =>
      current.source === source && current.status !== next ? { source, status: next } : current,
    );
  const layer: PhotoLayerSource | undefined =
    source && status !== "failed"
      ? { source, onLoad: () => settle("ready"), onError: () => settle("failed") }
      : undefined;
  return { layer, ready: status === "ready" };
}

/** A decorative host image on a known rectangle, never an addressed control. */
export function PhotoLayer({
  source,
  onLoad,
  onError,
  width = "100%",
  stretch = false,
}: PhotoLayerSource & {
  width?: number | "100%";
  stretch?: boolean;
}) {
  return (
    <Image
      source={{ uri: source }}
      onLoad={onLoad}
      onError={onError}
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
