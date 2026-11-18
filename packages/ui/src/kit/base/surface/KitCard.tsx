import { Theme, YStack, addTheme, getThemes, styled, useThemeName } from "tamagui";
import type { ReactNode } from "react";
import { component, presets, space, type Swatch } from "../../../catalog";
import { useKit, useKitStyle } from "../../provider";
import { usePart } from "../../part";
import {
  CardStyleContext,
  outlined,
  shifted,
  surfaceOf,
  tintOf,
  type CardStyle,
  type SurfaceTone,
} from "../text";

const Frame = styled(YStack, {
  variants: {
    cardStyle: {
      plain: { backgroundColor: "transparent" },
      inset: {},
      cards: { backgroundColor: "transparent" },
    },
  } as const,
});
type CardProps = {
  children: ReactNode;
  style?: CardStyle;
  part?: string;
  /** `inset` cards only: the preset surface (default), a `tinted` fill in the tone, or an `outlined` rule. */
  look?: "surface" | "tinted" | "outlined";
  tone?: SurfaceTone;
  /** Clip children to the rounded corners (a photo at the top of a card). */
  clip?: boolean;
  /** Makes the whole card one link (needs `label`): one root address, press goes to `goto`. */
  goto?: string | undefined;
  label?: string;
  /** Insets the children like a row's content (for a component built from text and icons, not rows). */
  padded?: boolean;
  /** Horizontal padding for padded content; `none` keeps form controls at the screen gutter. */
  inset?: "md" | "none";
  swatch?: Swatch;
};

function swatchTheme(parent: string, swatch?: Swatch) {
  if (!swatch) return parent;
  const name = `${parent}_swatch_${swatch}`;
  if (!getThemes()[name]) {
    const background = component.swatch[swatch];
    const channels = [1, 3, 5].map((at) => {
      const value = parseInt(background.slice(at, at + 2), 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    const luminance = channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
    const bold = presets.find((preset) => preset.id === "bold")!;
    const foreground = luminance > 0.179 ? bold.roles.dark.bg : bold.roles.light.surface;
    addTheme({
      name,
      theme: {
        ...getThemes()[parent],
        text: foreground,
        muted: foreground,
        accent: foreground,
        onAccent: background,
        good: foreground,
        warn: foreground,
        bad: foreground,
      },
    });
  }
  return name;
}

export function KitCard({
  children,
  style = "inset",
  part = "root",
  look = "surface",
  tone = "neutral",
  clip = false,
  goto,
  label,
  padded = false,
  inset = "md",
  swatch,
}: CardProps) {
  const ks = useKitStyle();
  const kit = useKit();
  const root = usePart(part);
  const theme = swatchTheme(useThemeName(), swatch);
  const surface =
    style !== "inset"
      ? {}
      : look === "tinted"
        ? tintOf(tone)
        : look === "outlined"
          ? outlined
          : surfaceOf(ks.surface);
  return (
    <CardStyleContext.Provider value={style}>
      <Theme name={theme}>
        <Frame
          {...root}
          {...surface}
          {...(swatch ? { backgroundColor: component.swatch[swatch] } : {})}
          cardStyle={style}
          borderRadius={shifted("md", ks.radiusShift)}
          padding={padded ? space.md : style === "inset" ? space.xs : component.base.none}
          {...(padded && inset === "none" ? { paddingHorizontal: component.base.none } : {})}
          gap={style === "cards" ? space[ks.density.gap] : padded ? space.sm : component.base.none}
          {...(clip ? { overflow: "hidden" as const } : {})}
          accessibilityRole={goto ? "link" : "list"}
          {...(label ? { accessibilityLabel: label } : {})}
          {...(kit.interactive && kit.controller && goto
            ? { onPress: () => kit.controller!.press(root.testID) }
            : kit.interactive && goto
              ? { onPress: () => kit.onLink?.(goto, root.testID) }
              : {})}
        >
          {children}
        </Frame>
      </Theme>
    </CardStyleContext.Provider>
  );
}
