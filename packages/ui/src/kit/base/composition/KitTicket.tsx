import { Children, type ReactNode } from "react";
import { XStack, YStack, useTheme } from "tamagui";
import { Line, Svg } from "react-native-svg";
import { component, radius, space } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKitStyle } from "../../provider";
import { KitCode } from "../codes";
import { shifted, surfaceOf } from "../text";
import { PanelEmpty, usePanelTarget } from "./KitFlip";

type TicketProps = {
  part?: string | null;
  loading?: boolean;
  children: ReactNode;
  code?: ReactNode;
  style?: "card" | "pass";
  used?: boolean;
  target?: { item?: string; part: string | null };
  label: string;
};

function Perforation({ edge }: { edge: number }) {
  const notch = space.md + space.xs;
  const theme = useTheme();
  return (
    <XStack height={notch} alignItems="center" pointerEvents="none" aria-hidden accessibilityElementsHidden>
      <YStack
        position="absolute"
        left={-notch / 2 - edge}
        width={notch}
        height={notch}
        borderRadius={radius.pill}
        backgroundColor="$bg"
      />
      <YStack flex={1} marginHorizontal={space.lg}>
        <Svg width="100%" height={component.base.strongBorder}>
          <Line
            x1="0%"
            x2="100%"
            y1="50%"
            y2="50%"
            stroke={theme.line?.val}
            strokeWidth={component.base.borderWidth}
            strokeDasharray={[space.xs, space.xs]}
          />
        </Svg>
      </YStack>
      <YStack
        position="absolute"
        right={-notch / 2 - edge}
        width={notch}
        height={notch}
        borderRadius={radius.pill}
        backgroundColor="$bg"
      />
    </XStack>
  );
}

function TicketHeaderPlaceholder({ centered }: { centered: boolean }) {
  const ks = useKitStyle();
  return (
    <YStack
      width="100%"
      maxWidth={component.base.ringLg}
      gap={space.sm}
      alignItems={centered ? "center" : "flex-start"}
      aria-hidden
    >
      {["48%", "88%", "68%"].map((width, index) => (
        <YStack
          key={width}
          width={width}
          height={index === 1 ? space.md : space.xs + component.base.strongBorder}
          borderRadius={shifted("sm", ks.radiusShift)}
          backgroundColor="$line"
        />
      ))}
    </YStack>
  );
}

function TicketBody({ children, label, loading = false, style, target }: TicketProps) {
  const targetProps = usePanelTarget(target, label, loading, false);
  const pass = style === "pass";
  return (
    <YStack
      {...targetProps}
      minHeight={pass ? component.base.ringMd : component.base.ringMd - space.lg}
      paddingHorizontal={space.lg}
      paddingVertical={space.md}
      justifyContent="center"
      alignItems={pass ? "center" : "stretch"}
      gap={space.xs}
    >
      {loading ? (
        <TicketHeaderPlaceholder centered={pass} />
      ) : Children.toArray(children).length ? (
        children
      ) : (
        <PanelEmpty icon="ticket" label={label} />
      )}
    </YStack>
  );
}

function TicketStub({ code, label, loading }: Pick<TicketProps, "code" | "label" | "loading">) {
  return (
    <YStack paddingHorizontal={space.lg} paddingTop={space.sm} paddingBottom={space.lg} alignItems="center">
      {loading ? <KitCode part={null} label={label} loading /> : code}
    </YStack>
  );
}

/** A perforated card or pass with independent caller-owned content and code. */
export function KitTicket({ part = "root", ...props }: TicketProps) {
  const context = usePartContext();
  const ks = useKitStyle();
  const item = props.target?.item ?? context.item;
  const addressed = part !== null && (props.loading || part !== props.target?.part || item !== context.item);
  const address = usePart(part ?? "root", addressed);
  const stub = Children.toArray(props.code).length > 0;
  const surface = surfaceOf(ks.surface);
  const corner = shifted("md", ks.radiusShift);
  return (
    <YStack
      {...(addressed ? address : {})}
      {...surface}
      borderRadius={corner}
      aria-busy={props.loading || undefined}
      accessibilityLabel={!props.loading && props.target?.part == null ? props.label : undefined}
    >
      <YStack borderRadius={corner} backgroundColor={props.used && !props.loading ? "$raised" : "$surface"}>
        <PartContext.Provider value={{ ...context, ...(item ? { item } : {}) }}>
          <TicketBody {...props} />
        </PartContext.Provider>
        <Perforation edge={surface.borderWidth} />
        {stub ? (
          <TicketStub code={props.code} label={props.label} loading={Boolean(props.loading)} />
        ) : (
          <YStack height={space.md} aria-hidden />
        )}
      </YStack>
    </YStack>
  );
}
