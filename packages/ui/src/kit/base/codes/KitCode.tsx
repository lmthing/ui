import { useMemo } from "react";
import { Svg, Path, Rect } from "react-native-svg";
import { YStack } from "tamagui";
import { Barcode, QrCode } from "@tamagui/lucide-icons";
import qrcode from "qrcode-generator";
import { component, radius, size, space } from "../../../catalog";
import { usePart } from "../../part";
import { useKitStyle } from "../../provider";
import { KitIcon, KitText, shifted, surfaceOf } from "../text";
import { barcodeDrawing } from "./barcode";

type CodeProps = {
  part?: string | null;
  loading?: boolean;
  value?: string;
  label: string;
  used?: boolean;
  unavailable?: boolean;
  kind?: "qr" | "barcode";
  scale?: "standard" | "scanner";
};

// QR uses a four-module quiet zone on all sides, independent of the theme and the matrix size.
const quiet = 4;

function encode(value: string | undefined) {
  if (!value) return;
  try {
    const qr = qrcode(0, "M");
    // The byte-mode encoder reads the low byte of each code unit. Supply UTF-8 without changing its global codec.
    const bytes = encodeURIComponent(value).replace(/%([\dA-F]{2})/g, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    );
    qr.addData(bytes);
    qr.make();
    return qr;
  } catch {
    return;
  }
}

export function codeDrawing(value: string | undefined) {
  const qr = encode(value);
  if (!qr) return;
  const count = qr.getModuleCount();
  const runs: string[] = [];
  for (let y = 0; y < count; y++) {
    let x = 0;
    while (x < count) {
      if (!qr.isDark(y, x)) {
        x++;
        continue;
      }
      const start = x;
      while (x < count && qr.isDark(y, x)) x++;
      const run = x - start;
      runs.push(`M${start + quiet} ${y + quiet}h${run}v1h${-run}z`);
    }
  }
  return { path: runs.join(" "), side: count + quiet * 2 };
}

function CodeFallback({
  kind,
  used,
  label,
}: {
  kind: NonNullable<CodeProps["kind"]>;
  used: boolean;
  label: string;
}) {
  const Glyph = kind === "barcode" ? Barcode : QrCode;
  return (
    <YStack alignItems="center" gap={space.md} padding={space.md}>
      <YStack
        width={size.control.md}
        height={size.control.md}
        alignItems="center"
        justifyContent="center"
        borderRadius={radius.pill}
        backgroundColor={used ? "$goodSoft" : "$raised"}
        aria-hidden
      >
        {used ? (
          <KitIcon name="circle_check" tone="good" scale="lg" decorative />
        ) : (
          <Glyph size={size.icon.lg} color="$muted" aria-hidden />
        )}
      </YStack>
      <KitText part={null} align="center" role="label">
        {label}
      </KitText>
    </YStack>
  );
}

/** Draw only the supplied payload, on a fixed-contrast plate with a symbology-specific quiet zone. */
export function KitCode({
  part = "root",
  loading = false,
  value,
  label,
  used = false,
  unavailable = false,
  kind = "qr",
  scale = "standard",
}: CodeProps) {
  const address = usePart(part ?? "root", part !== null);
  const ks = useKitStyle();
  const payload = loading || used || unavailable ? undefined : value;
  const enlarged = scale === "scanner";
  const edge = enlarged ? component.base.codeScanner : component.base.ringLg;
  const frameEdge = edge + space.md * 2;
  const drawing = useMemo(
    () => (kind === "barcode" ? barcodeDrawing(payload, component.base.ringLg) : codeDrawing(payload)),
    [kind, payload],
  );
  const linear = drawing && "height" in drawing ? (drawing.height as number) : undefined;
  const height =
    kind === "barcode" && (drawing || loading) ? (enlarged ? size.avatar.lg : size.control.lg) : edge;
  return (
    <YStack
      {...(part === null ? {} : address)}
      width={frameEdge}
      height={height + space.md * 2}
      {...(enlarged && { maxWidth: "100%", backgroundColor: component.swatch.white })}
      alignSelf="center"
      alignItems="center"
      justifyContent="center"
      gap={space.sm}
      borderRadius={shifted("md", ks.radiusShift)}
      {...(enlarged ? {} : surfaceOf(ks.surface))}
      aria-busy={loading || undefined}
      accessibilityRole={drawing ? "image" : undefined}
      accessibilityLabel={drawing ? label : undefined}
    >
      {drawing ? (
        <Svg
          width={edge}
          height={height}
          viewBox={`0 0 ${drawing.side} ${linear ?? drawing.side}`}
          preserveAspectRatio={linear ? "none" : undefined}
          aria-hidden
        >
          <Rect width={drawing.side} height={linear ?? drawing.side} fill={component.swatch.white} />
          <Path d={drawing.path} fill={component.swatch.black} />
        </Svg>
      ) : loading ? (
        <YStack width={edge} height={height} borderRadius={radius.sm} backgroundColor="$line" aria-hidden />
      ) : (
        <CodeFallback kind={kind} used={used} label={label} />
      )}
    </YStack>
  );
}
