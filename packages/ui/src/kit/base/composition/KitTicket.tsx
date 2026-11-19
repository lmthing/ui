import { Children, type ReactNode } from "react";
import { XStack, YStack } from "tamagui";
import { component, radius, space } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKitStyle } from "../../provider";
import { shifted, surfaceOf } from "../text";
import { PanelEmpty, PanelPlaceholder, usePanelTarget } from "./KitFlip";

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

function Perforation() {
  const notch = space.md + space.xs;
  return (
    <XStack height={notch} alignItems="center" pointerEvents="none" aria-hidden accessibilityElementsHidden>
      <YStack
        position="absolute"
        left={-notch / 2}
        width={notch}
        height={notch}
        borderRadius={radius.pill}
        backgroundColor="$bg"
      />
      <YStack
        flex={1}
        marginHorizontal={space.lg}
        borderTopWidth={component.base.borderWidth}
        borderColor="$muted"
        borderStyle="dashed"
      />
      <YStack
        position="absolute"
        right={-notch / 2}
        width={notch}
        height={notch}
        borderRadius={radius.pill}
        backgroundColor="$bg"
      />
    </XStack>
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
        <PanelPlaceholder centered={pass} />
      ) : Children.toArray(children).length ? (
        children
      ) : (
        <PanelEmpty icon="ticket" label={label} />
      )}
    </YStack>
  );
}

function TicketStub({ code, loading }: Pick<TicketProps, "code" | "loading">) {
  const ks = useKitStyle();
  return (
    <YStack paddingHorizontal={space.lg} paddingTop={space.sm} paddingBottom={space.lg} alignItems="center">
      {loading ? (
        <YStack
          width={component.base.ringLg}
          height={component.base.ringLg}
          borderRadius={shifted("md", ks.radiusShift)}
          alignItems="center"
          justifyContent="center"
          backgroundColor="$raised"
          aria-hidden
        >
          <YStack
            width={component.base.ringMd}
            height={component.base.ringMd}
            borderRadius={radius.sm}
            backgroundColor="$line"
          />
        </YStack>
      ) : (
        code
      )}
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
  return (
    <YStack
      {...(addressed ? address : {})}
      {...surfaceOf(ks.surface)}
      borderRadius={shifted(props.style === "pass" ? "xl" : "lg", ks.radiusShift)}
      aria-busy={props.loading || undefined}
      accessibilityLabel={!props.loading && props.target?.part == null ? props.label : undefined}
    >
      <YStack
        overflow="hidden"
        borderRadius={shifted(props.style === "pass" ? "xl" : "lg", ks.radiusShift)}
        backgroundColor={props.used && !props.loading ? "$raised" : "$surface"}
      >
        <PartContext.Provider value={{ ...context, ...(item ? { item } : {}) }}>
          <TicketBody {...props} />
        </PartContext.Provider>
        <Perforation />
        {stub ? (
          <TicketStub code={props.code} loading={Boolean(props.loading)} />
        ) : (
          <YStack alignItems="center" paddingBottom={space.sm} aria-hidden>
            <YStack
              width={props.style === "pass" ? space.xl : space.lg}
              height={space.xs}
              backgroundColor={props.used && !props.loading ? "$good" : "$line"}
              borderRadius={radius.pill}
            />
          </YStack>
        )}
      </YStack>
    </YStack>
  );
}
