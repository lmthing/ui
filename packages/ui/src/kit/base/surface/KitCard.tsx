import { Theme, YStack, createVariable, getThemes, isWeb, styled, useThemeName } from "tamagui";
import type { ReactNode } from "react";
import {
  component,
  presets,
  space,
  variants,
  type AxisValue,
  type Swatch,
  type ThemeDensity,
} from "../../../catalog";
import { useKit, useKitStyle, useVariantDensity } from "../../provider";
import { useComponentState, usePart } from "../../part";
import { CardStyleContext, shifted, variantSurfaceOf, type CardStyle, type SurfaceTone } from "../text";

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
  /** Finish of the enclosing card. `style="cards"` stays a transparent wrapper for individual rows. */
  surface?: AxisValue<"surface">;
  density?: ThemeDensity;
  align?: AxisValue<"align">;
  /** `edge` cancels the phone gutter when this card is the screen-level frame. */
  bleed?: AxisValue<"bleed">;
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
    const theme = { ...getThemes()[parent] };
    for (const role of ["text", "muted", "accent", "good", "warn", "bad", "onAccent"]) {
      theme[role] = createVariable({
        key: role,
        name: role,
        val: role === "onAccent" ? background : foreground,
      });
    }
    getThemes()[name] = theme;
  }
  return name;
}

function CardChildren({ loading, children }: { loading: boolean; children: ReactNode }) {
  return loading ? (
    <YStack
      opacity={component.base.none}
      aria-hidden
      accessibilityElementsHidden
      {...(isWeb ? { style: { visibility: "hidden" } as never, inert: true } : {})}
    >
      {children}
    </YStack>
  ) : (
    <>{children}</>
  );
}

function useCardFinish({ style, look, surface, tone, density, align, bleed, padded, inset }: CardProps) {
  const ks = useKitStyle();
  const spacing = useVariantDensity(density);
  const finish =
    style === "cards"
      ? "plain"
      : (surface ?? (style === "plain" ? "plain" : look === "surface" ? "card" : look));
  const gutter = variants.bleed[bleed ?? "inset"];
  return {
    ...variantSurfaceOf(finish ?? "card", ks.surface, tone ?? "neutral"),
    borderRadius: shifted("md", ks.radiusShift),
    padding: padded ? space.md : style === "inset" ? space.xs : component.base.none,
    ...(padded && inset === "none" ? { paddingHorizontal: component.base.none } : {}),
    gap: style === "cards" ? space[spacing.gap] : padded ? space[spacing.contentGap] : component.base.none,
    ...(align === "center" ? { alignItems: variants.align.center.content } : {}),
    ...(gutter ? { marginHorizontal: -space[gutter] } : {}),
  };
}

function useCardPress(address: string, goto: CardProps["goto"], loading: boolean) {
  const kit = useKit();
  if (!kit.interactive || loading || !goto) return {};
  return { onPress: () => (kit.controller ? kit.controller.press(address) : kit.onLink?.(goto, address)) };
}

export function KitCard(props: CardProps) {
  const { children, style = "inset", part = "root", clip = false, goto, label, swatch } = props;
  const root = usePart(part);
  const loading = useComponentState() === "loading" && Boolean(swatch);
  const theme = swatchTheme(useThemeName(), swatch);
  const finish = useCardFinish({ ...props, style });
  const action = useCardPress(root.testID, goto, loading);
  return (
    <CardStyleContext.Provider value={style}>
      <Theme name={theme}>
        <Frame
          {...root}
          cardStyle={style}
          {...finish}
          {...(swatch ? { backgroundColor: loading ? "$line" : component.swatch[swatch] } : {})}
          {...(swatch && isWeb ? { className: `kit-swatch-${swatch}` } : {})}
          {...(clip ? { overflow: "hidden" as const } : {})}
          accessibilityRole={loading ? undefined : goto ? "link" : label ? "group" : undefined}
          accessibilityLabel={loading ? undefined : label}
          {...action}
        >
          {swatch && isWeb && (
            <style>{`.kit-swatch-${swatch}{${["text", "muted", "accent", "good", "warn", "bad", "onAccent"].map((role) => `--${role}:${getThemes()[theme]![role]!.val}`).join(";")}}`}</style>
          )}
          <CardChildren loading={loading}>{children}</CardChildren>
        </Frame>
      </Theme>
    </CardStyleContext.Provider>
  );
}
