import { isIos } from "@tamagui/core";
import { isWeb, ScrollView, Text, XStack, YStack, styled } from "tamagui";
import { component, size, space, type as typography } from "../../../catalog";
import { useCopyFeedback } from "../../interact";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKitStyle, useWords } from "../../provider";
import { KitAction } from "../input";
import { KitText, shifted, surfaceOf } from "../text";
import { RichEmpty, type Drawing, type Target } from "./rich-drawing";

const Source = styled(Text, {
  fontFamily: component.codeFont[isIos ? "ios" : isWeb ? "web" : "android"],
  fontSize: typography.label.size,
  lineHeight: typography.label.lineHeight,
});
const lexicalLanguage = /^(js|jsx|javascript|ts|tsx|typescript|json)$/i;
const lexicalToken = new RegExp(
  `(${[
    /\/\/[^\r\n]*/,
    /\/\*[\s\S]*?\*\//,
    /"(?:\\.|[^"\\\r\n])*"/,
    /'(?:\\.|[^'\\\r\n])*'/,
    /`(?:\\.|[^`\\])*`/,
    /\b(?:const|let|var|async|await|return|if|else|function|class|import|export|from|new|true|false|null|undefined)\b/,
    /\b\d+(?:\.\d+)?\b/,
  ]
    .map((branch) => branch.source)
    .join("|")})`,
  "g",
);

type SourceProps = {
  code: string;
  wrap: boolean;
  loading: boolean;
  language?: string | undefined;
  label?: string | undefined;
};

function sourceRuns(code: string, language?: string) {
  if (!lexicalLanguage.test(language ?? "")) return code;
  return code.split(lexicalToken).map((text, index) =>
    index % 2 ? (
      <Text
        key={index}
        color={text.startsWith("/") ? "$muted" : "$accent"}
        {...(isWeb ? { style: { whiteSpace: "inherit" } } : {})}
      >
        {text}
      </Text>
    ) : (
      text
    ),
  );
}

function skeletonRuns(code: string) {
  return code.split(/(\s+)/u).map((run, index) =>
    index % 2 || !run ? (
      run
    ) : (
      <Text
        key={index}
        color="transparent"
        backgroundColor="$line"
        {...(isWeb ? { style: { whiteSpace: "inherit", font: "inherit" } } : {})}
      >
        {run.replace(/./gu, "x")}
      </Text>
    ),
  );
}

function CodeSource({ code, wrap, loading, language, label }: SourceProps) {
  const { codeLabels, placeholderDetail } = useWords().words;
  const style = {
    whiteSpace: wrap ? "pre-wrap" : "pre",
    overflowWrap: wrap ? "anywhere" : "normal",
  } as const;
  const text = (
    <Source
      color="$text"
      userSelect={loading ? "none" : "text"}
      opacity={loading ? component.base.none : undefined}
      aria-hidden={loading || undefined}
      accessibilityElementsHidden={loading}
      {...(isWeb
        ? { tag: loading ? "span" : "code", style: loading ? { ...style, visibility: "hidden" } : style }
        : {})}
    >
      {sourceRuns(code || placeholderDetail, language)}
    </Source>
  );
  // Use the real line layout for sizing, including non-Latin glyphs and wrap points.
  const drawing = loading ? (
    <YStack
      pointerEvents="none"
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {text}
      <YStack fullscreen overflow="hidden">
        <Source {...(isWeb ? { style } : {})}>{skeletonRuns(code || placeholderDetail)}</Source>
      </YStack>
    </YStack>
  ) : (
    text
  );
  if (wrap) return <YStack padding={space.md}>{drawing}</YStack>;
  return (
    <ScrollView
      horizontal
      scrollEnabled={!loading}
      contentContainerStyle={{ padding: space.md }}
      accessibilityLabel={loading ? undefined : (label ?? codeLabels.block)}
      {...(isWeb ? { tabIndex: loading ? -1 : 0 } : {})}
    >
      {drawing}
    </ScrollView>
  );
}

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
      {hidden ? <NoCopy part={target.part} /> : <CopyButton part={target.part} code={code} />}
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
