import { useContext, useLayoutEffect, useMemo, type ReactElement } from "react";
import { YStack } from "tamagui";
import { component, radius, size, space } from "../../../catalog";
import { PrivateMarkContext, type PrivateMarkAdapter } from "../../interact/runtime";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit, useKitStyle } from "../../provider";
import { KitIcon, KitText, shifted } from "../text";

type PadProps = {
  part?: string;
  loading?: boolean;
  label: string;
  mark?: string;
  disabled?: boolean;
  target: { part: string; item?: string };
};

function resolveMark(adapter: PrivateMarkAdapter | undefined, address: string, mark: string) {
  try {
    return mark ? adapter?.resolve(address, mark) : undefined;
  } catch {
    return undefined;
  }
}

function useCapture(address: string, adapter: PrivateMarkAdapter | undefined, enabled: boolean) {
  const { controller } = useKit();
  const binding = useMemo<{ capture?: (mark: string) => void }>(
    () => ({}),
    [address, adapter, controller, enabled],
  );
  useLayoutEffect(() => {
    const pad = controller?.registerPrivateMarkPart(
      address,
      enabled ? (mark) => Boolean(resolveMark(adapter, address, mark)) : undefined,
    );
    if (!pad) return;
    binding.capture = pad.capture;
    return () => {
      delete binding.capture;
      pad.unregister();
    };
  }, [address, adapter, binding, enabled, controller]);
  return (mark: string) => binding.capture?.(mark);
}

function PadDrawing({
  label,
  preview,
  unavailable,
  loading,
}: {
  label: string;
  preview: ReactElement | undefined;
  unavailable: boolean;
  loading: boolean;
}) {
  return (
    <YStack
      width="100%"
      minHeight={component.base.ringLg}
      padding={space.md}
      gap={space.sm}
      alignItems="center"
      justifyContent="center"
      aria-hidden={loading || undefined}
      pointerEvents="none"
    >
      <YStack width="100%" height={component.base.hourHeight} alignItems="center" justifyContent="center">
        {loading ? (
          <YStack width="48%" height={size.icon.md} borderRadius={radius.pill} backgroundColor="$line" />
        ) : (
          (preview ?? <KitIcon name={unavailable ? "lock" : "pencil"} scale="lg" decorative />)
        )}
      </YStack>
      {loading ? (
        <YStack height={size.icon.md} width="100%" alignItems="center" justifyContent="center">
          <YStack width="36%" height={space.sm} borderRadius={radius.pill} backgroundColor="$line" />
        </YStack>
      ) : (
        <KitText part={null} role="label" align="center" tone={unavailable ? "muted" : "text"}>
          {label}
        </KitText>
      )}
    </YStack>
  );
}

function PadSurface({ label, mark, disabled, loading, target }: Omit<PadProps, "part">) {
  const adapter = useContext(PrivateMarkContext);
  const { interactive, controller } = useKit();
  const address = usePart(target.part, !loading);
  const preview = loading || mark === undefined ? undefined : resolveMark(adapter, address.testID, mark);
  const unavailable = !adapter || (mark !== undefined && !preview);
  const enabled = Boolean(!loading && !disabled && !unavailable && interactive && controller);
  const onMark = useCapture(address.testID, adapter, enabled);
  const Surface = adapter?.Surface;
  const drawing = <PadDrawing {...{ label, preview, unavailable, loading: Boolean(loading) }} />;
  return (
    <YStack
      {...(!loading ? address : {})}
      aria-disabled={(!loading && (unavailable || disabled)) || undefined}
    >
      {enabled && Surface ? (
        <Surface key={address.testID} address={address.testID} label={label} onMark={onMark}>
          {drawing}
        </Surface>
      ) : (
        drawing
      )}
    </YStack>
  );
}

/** A private drawing frame. The host owns marks; disabled, loading and unresolved pads never capture. */
export function KitSignaturePad({ part = "root", loading = false, target, ...props }: PadProps) {
  const scope = usePartContext();
  const ks = useKitStyle();
  const item = target.item ?? scope.item;
  const separate = loading || part !== target.part || item !== scope.item;
  const address = usePart(part, separate);
  return (
    <YStack
      {...(separate ? address : {})}
      width="100%"
      borderRadius={shifted("md", ks.radiusShift)}
      borderWidth={component.base.borderWidth}
      borderColor="$line"
      backgroundColor="$raised"
      aria-busy={loading || undefined}
    >
      <PartContext.Provider value={item === undefined ? scope : { ...scope, item }}>
        <PadSurface {...props} target={target} loading={loading} />
      </PartContext.Provider>
    </YStack>
  );
}
