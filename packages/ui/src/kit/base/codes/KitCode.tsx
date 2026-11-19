import { useMemo } from "react";
import { Svg, Path, Rect } from "react-native-svg";
import { YStack } from "tamagui";
import { QrCode } from "@tamagui/lucide-icons";
import qrcode from "qrcode-generator";
import { component, radius, size, space } from "../../../catalog";
import { usePart } from "../../part";
import { useKitStyle } from "../../provider";
import { KitIcon, KitText, shifted, surfaceOf } from "../text";

type CodeProps = { part?: string | null; loading?: boolean; value?: string; label: string; used?: boolean };

// QR uses a four-module quiet zone on all sides, independent of the theme and the matrix size.
const quiet = 4;
const edge = component.base.ringLg;
const frameEdge = edge + space.md * 2;

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

/** A fixed-contrast QR drawing. An unavailable or used code never exposes a scannable matrix. */
export function KitCode({ part = "root", loading = false, value, label, used = false }: CodeProps) {
  const address = usePart(part ?? "root", part !== null);
  const ks = useKitStyle();
  const drawing = useMemo(() => codeDrawing(loading || used ? undefined : value), [loading, used, value]);
  return (
    <YStack
      {...(part === null ? {} : address)}
      width={frameEdge}
      height={frameEdge}
      alignSelf="center"
      alignItems="center"
      justifyContent="center"
      gap={space.sm}
      borderRadius={shifted("md", ks.radiusShift)}
      {...surfaceOf(ks.surface)}
      aria-busy={loading || undefined}
      accessibilityRole={drawing ? "image" : undefined}
      accessibilityLabel={drawing ? label : undefined}
    >
      {drawing ? (
        <Svg width={edge} height={edge} viewBox={`0 0 ${drawing.side} ${drawing.side}`} aria-hidden>
          <Rect width={drawing.side} height={drawing.side} fill={component.swatch.white} />
          <Path d={drawing.path} fill={component.swatch.black} />
        </Svg>
      ) : loading ? (
        <YStack width={edge} height={edge} borderRadius={radius.sm} backgroundColor="$line" aria-hidden />
      ) : (
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
              <QrCode size={size.icon.lg} color="$muted" aria-hidden />
            )}
          </YStack>
          <KitText part={null} align="center" role="label">
            {label}
          </KitText>
        </YStack>
      )}
    </YStack>
  );
}
