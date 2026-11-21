import { useContext, useId, type ReactNode } from "react";
import { XStack, YStack, isWeb, styled, useThemeName } from "tamagui";
import { component, size, space, type as typography, type AxisValue } from "../../../catalog";
import { useKit, useKitStyle, useVariantDensity } from "../../provider";
import { PartContext, usePart, usePartContext } from "../../part";
import { RowLabelContext } from "../../a11y";
import {
  CardStyleContext,
  shifted,
  tintOf,
  useTextStep,
  variantSurfaceOf,
  type SurfaceTone,
  type TextFinish,
  type TextTone,
} from "../text";
import { RowDecoration, RowGroupLead, RowStatusRule } from "../layout";
const Frame = styled(XStack, { alignItems: "center", minHeight: size.control.md });
const Content = styled(XStack, { flex: component.base.bodyFlex, alignItems: "flex-start" });
// Leading and trailing items centre on the title's first line, not on the middle of the text stack.
// Taller items (a 44px touch target) overflow the line equally above and below.
const Edge = styled(YStack, { alignSelf: "flex-start", justifyContent: "center", alignItems: "center" });
type LineRole = keyof typeof typography;
type RowProps = {
  children: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  goto?: string | undefined;
  label: string;
  lineRole?: LineRole;
  role?: "text" | "button" | "group";
  /** A row that opens in place (role `button`): whether its content is shown. */
  expanded?: boolean;
  /** Shift the leading and text slots one level; the row and trailing edge stay put. */
  indent?: 0 | 1;
  selected?: boolean;
  tone?: SurfaceTone | undefined;
  rowTone?: TextTone | "neutral" | undefined;
  surface?: AxisValue<"surface"> | undefined;
  mark?: AxisValue<"mark"> | undefined;
  /** `line`: centre the leading item on the first line (icons). `row`: centre it on the whole text (a thumbnail taller than a line). */
  leadingAlign?: "line" | "row";
  /** Reserve the same avatar-width leading column for every row in a mixed list. */
  leadingWidth?: "avatar" | undefined;
  /** An inset-free, tightly spaced row inside an already padded surface. */
  inline?: boolean;
  /** Shrink a passive inline row to its contents. Interactive rows keep the touch target. */
  fitContent?: boolean;
  addressed?: boolean;
  part?: string | null;
  /** Horizontal inset: `md` (a row in a card) or `none` (a cell in a `KitGrid`, which spaces its own columns). */
  inset?: "md" | "none";
} & TextFinish;
function rowTint(tone: TextTone | undefined) {
  if (!tone) return {};
  if (tone === "text" || tone === "muted") return { backgroundColor: "$raised" } as const;
  return {
    backgroundColor: tintOf(tone === "accent" || tone === "onAccent" ? "neutral" : tone).backgroundColor,
  };
}
function useRowSurface(tone: RowProps["tone"], rowTone: TextTone | undefined, surface: RowProps["surface"]) {
  const style = useContext(CardStyleContext);
  const preset = useKitStyle().surface;
  const finish = surface ?? (tone ? "tinted" : style === "cards" ? "card" : "plain");
  const semantic = rowTone === "good" || rowTone === "warn" || rowTone === "bad" ? rowTone : undefined;
  return {
    ...variantSurfaceOf(finish, preset, tone ?? (surface ? semantic : undefined) ?? "neutral"),
    ...(surface === undefined ? rowTint(rowTone) : {}),
  };
}

function useRowStatus(tone: TextTone | undefined, inset: boolean, surface: RowProps["surface"]) {
  const dark = useThemeName().includes("dark");
  const semantic = tone === "good" || tone === "warn" || tone === "bad";
  return semantic && (surface ? surface !== "tinted" : dark && inset) ? tone : null;
}

function useRowPress(address: string, part: RowProps["part"], goto: RowProps["goto"]) {
  const kit = useKit();
  if (part === null || !kit.interactive) return undefined;
  if (kit.controller) return () => kit.controller!.press(address);
  if (goto) return () => kit.onLink?.(goto, address);
}

export function Row(props: RowProps) {
  const { children, leading, trailing, goto, label, role, expanded, selected } = props;
  const { tone, rowTone, surface, mark, density, emphasis, lineRole = "body" } = props;
  const { leadingAlign = "line", inline = false, addressed = true } = props;
  const groupLead = useContext(RowGroupLead),
    leadingWidth = props.leadingWidth ?? groupLead;
  const { part = "root", inset = "md", indent } = props;
  const line = typography[useTextStep({ density, emphasis })(lineRole)].lineHeight;
  const ks = useKitStyle();
  const spacing = useVariantDensity(density);
  const semanticTone = rowTone === "neutral" ? undefined : rowTone;
  const status = useRowStatus(semanticTone, !inline && inset === "md", surface);
  const dimmed = !selected && mark === "muted";
  const address = usePart(part ?? "root", addressed && part !== null);
  const actionRole = goto ? "link" : role === "button" ? role : undefined;
  const id = useId();
  // Prefer the rendered text order for web actions; keep the caller's label as the fallback.
  const contentId = isWeb && actionRole ? id : undefined;
  const press = useRowPress(address.testID, part, goto);
  return (
    <Frame
      {...(addressed && part !== null ? address : {})}
      {...useRowSurface(tone, semanticTone ?? (selected ? "accent" : undefined), surface)}
      paddingVertical={inline ? component.base.none : space[spacing.rowPad]}
      {...(inline && props.fitContent && !actionRole ? { minHeight: line } : {})}
      paddingHorizontal={inline || inset === "none" ? component.base.none : space.md}
      borderRadius={shifted("md", ks.radiusShift)}
      accessibilityRole={actionRole ?? (role === "group" && label ? "group" : undefined)}
      data-kit-row={isWeb && actionRole ? "" : undefined}
      accessibilityLabel={actionRole || role === "group" ? label : undefined}
      aria-labelledby={contentId}
      aria-current={selected || undefined}
      aria-expanded={expanded}
      onPress={actionRole ? press : undefined}
    >
      {((status && surface === undefined) || dimmed) && <RowDecoration fade />}
      <Content
        {...(contentId ? { id: contentId } : {})}
        paddingLeft={indent === 1 ? space.xl : undefined}
        gap={inline ? space.xs : space[spacing.gap]}
        minHeight={inline ? line : Math.max(line, size.control.md - space[spacing.rowPad] * 2)}
      >
        <RowLabelContext.Provider value={label}>
          {(leading || groupLead) && <RowLeading {...{ leading, leadingAlign, leadingWidth, line }} />}
          <RowGroupLead.Provider value={undefined}>
            <YStack flex={component.base.bodyFlex}>{children}</YStack>
            {trailing && <RowTrailing line={line}>{trailing}</RowTrailing>}
          </RowGroupLead.Provider>
        </RowLabelContext.Provider>
      </Content>
      {status && <RowStatusRule tone={status} />}
      {(selected || mark === "highlight" || mark === "new") && (
        <RowDecoration fresh={!selected && mark === "new"} />
      )}
    </Frame>
  );
}

function RowLeading({
  leading,
  leadingAlign,
  leadingWidth,
  line,
}: Pick<RowProps, "leading" | "leadingAlign" | "leadingWidth"> & { line: number }) {
  return (
    <Edge
      {...(leadingAlign === "row" ? { alignSelf: "center" as const } : { height: line })}
      {...(leadingWidth === "avatar" ? { width: size.avatar.md } : {})}
    >
      {leading}
    </Edge>
  );
}

function RowTrailing({ line, children }: { line: number; children: ReactNode }) {
  return (
    <Edge height={line}>
      <XStack alignItems="center">{children}</XStack>
    </Edge>
  );
}

type KitRowProps = Omit<RowProps, "addressed" | "rowTone" | "tone"> & {
  item?: string;
  tone?: RowProps["rowTone"];
};

export function KitRow({ item, tone, ...props }: KitRowProps) {
  const context = usePartContext();
  if (!item) return <Row addressed={props.part !== undefined} rowTone={tone} {...props} />;
  return (
    <PartContext.Provider value={{ ...context, item }}>
      <Row role="group" rowTone={tone} {...props} />
    </PartContext.Provider>
  );
}
