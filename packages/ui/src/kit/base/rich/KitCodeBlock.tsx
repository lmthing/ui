import { useLayoutEffect, useReducer } from "react";
import { XStack, YStack } from "tamagui";
import { component, size, space } from "../../../catalog";
import { useCopyFeedback } from "../../interact";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKitStyle, useWords } from "../../provider";
import { KitAction } from "../input";
import { KitText, shifted, surfaceOf } from "../text";
import { CodeSource } from "./code-source";
import { RichEmpty, type Drawing, type Target } from "./rich-drawing";

type CodeProps = Drawing & {
  code: string;
  language?: string | undefined;
  label?: string;
  copyTarget: Target;
  wrap?: boolean;
};

function NoCopy({ part }: { part: string }) {
  const address = usePart(part, false);
  useCopyFeedback(address.testID, undefined, true);
  return null;
}

function CopyButton({ part, code }: { part: string; code: string }) {
  const { codeLabels } = useWords().words;
  const [, refresh] = useReducer((revision: number) => revision + 1, 0);
  // Recheck availability after the preceding loading/empty binding has been removed.
  useLayoutEffect(refresh, [part]);
  return (
    <KitAction
      action="copy"
      value={code}
      part={part}
      kind="quiet"
      icon="clipboard"
      a11y={codeLabels.copy}
      copiedLabel={codeLabels.copied}
    />
  );
}

function CopyTarget({ target, code, hidden }: { target: Target; code: string; hidden: boolean }) {
  const context = usePartContext();
  return (
    <PartContext.Provider value={target.item ? { ...context, item: target.item } : context}>
      {hidden ? (
        <NoCopy part={target.part} />
      ) : (
        <CopyButton key={target.item} part={target.part} code={code} />
      )}
    </PartContext.Provider>
  );
}

function CodeHeader({ code, language, label, copyTarget, loading = false }: CodeProps) {
  const ks = useKitStyle();
  const bar = (
    <YStack height={space.sm} backgroundColor="$line" borderRadius={shifted("sm", ks.radiusShift)} />
  );
  return (
    <XStack
      alignItems="center"
      justifyContent="space-between"
      minHeight={size.control.md}
      paddingHorizontal={space.md}
      gap={space.sm}
      backgroundColor="$raised"
    >
      {loading ? (
        <YStack width={size.control.lg} aria-hidden>
          {bar}
        </YStack>
      ) : (
        <XStack
          flex={component.base.bodyFlex}
          minWidth={component.base.none}
          alignItems="center"
          gap={space.sm}
        >
          {label && (
            <KitText role="label" part={null} lines={1}>
              {label}
            </KitText>
          )}
          {language && (
            <YStack
              backgroundColor="$surface"
              borderRadius={shifted("sm", ks.radiusShift)}
              paddingHorizontal={space.sm}
            >
              <KitText role="caption" tone="muted" part={null} lines={1}>
                {language}
              </KitText>
            </YStack>
          )}
        </XStack>
      )}
      {loading && (
        <YStack width={size.control.md} alignItems="center" aria-hidden>
          <YStack width={size.icon.md}>{bar}</YStack>
        </YStack>
      )}
      <CopyTarget target={copyTarget} code={code} hidden={loading} />
    </XStack>
  );
}

/** Displays and copies literal source, never rendered HTML or a wire action value. */
export function KitCodeBlock({ part = "root", loading, ...props }: CodeProps) {
  const { code, language, label, copyTarget } = props;
  const context = usePartContext();
  const busy = !!loading || context.state === "loading";
  const empty = context.state === "empty" || !code;
  const ks = useKitStyle();
  const words = useWords().words;
  const sharedPart =
    !busy && !empty && part === copyTarget.part && (copyTarget.item ?? context.item) === context.item;
  const address = usePart(part, !sharedPart);
  return (
    <YStack
      {...(!sharedPart ? address : {})}
      {...surfaceOf(ks.surface)}
      width="100%"
      minWidth={component.base.none}
      borderRadius={shifted("md", ks.radiusShift)}
      overflow="hidden"
      role="group"
      accessibilityLabel={busy ? words.loadingLabel : (label ?? language ?? words.codeLabels.block)}
      aria-busy={busy || undefined}
    >
      {!busy && empty ? (
        <>
          <CopyTarget target={copyTarget} code="" hidden />
          <RichEmpty />
        </>
      ) : (
        <>
          <CodeHeader {...props} loading={busy} />
          <CodeSource {...{ code, language, label }} wrap={props.wrap ?? false} loading={busy} />
        </>
      )}
    </YStack>
  );
}
