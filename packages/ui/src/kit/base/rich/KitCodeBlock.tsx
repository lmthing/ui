import { isIos } from "@tamagui/core";
import { isWeb, ScrollView, Text, XStack, YStack, styled } from "tamagui";
import { component, space, type as typography } from "../../../catalog";
import { useCopyFeedback } from "../../interact";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKitStyle, useWords } from "../../provider";
import { KitSkeleton } from "../helpers";
import { KitAction } from "../input";
import { KitText, shifted, surfaceOf } from "../text";
import { RichEmpty, type Drawing, type Target } from "./rich-drawing";

type CodeProps = Drawing & {
  code: string;
  language?: string | undefined;
  label?: string;
  copyTarget: Target;
  wrap?: boolean;
};

const Source = styled(Text, {
  fontFamily: component.codeFont[isIos ? "ios" : isWeb ? "web" : "android"],
  color: "$text",
  fontSize: typography.label.size,
  lineHeight: typography.label.lineHeight,
  userSelect: "text",
});
const lexicalLanguage = /^(js|jsx|javascript|ts|tsx|typescript|json)$/i;
const lexicalToken =
  /(\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\\r\n])*"|'(?:\\.|[^'\\\r\n])*'|`(?:\\.|[^`\\])*`|\b(?:const|let|var|async|await|return|if|else|function|class|import|export|from|new|true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b)/g;

function SourceText({ code, wrap, language }: Pick<CodeProps, "code" | "wrap" | "language">) {
  const chunks = lexicalLanguage.test(language ?? "") ? code.split(lexicalToken) : [code];
  return (
    <Source
      {...(isWeb
        ? {
            tag: "code",
            style: { whiteSpace: wrap ? "pre-wrap" : "pre", overflowWrap: wrap ? "anywhere" : "normal" },
          }
        : {})}
    >
      {chunks.map((text, index) =>
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
      )}
    </Source>
  );
}

function NoCopy({ part }: { part: string }) {
  const address = usePart(part, false);
  useCopyFeedback(address.testID, undefined, true);
  return null;
}

function CopyButton({ target, code, hidden = false }: { target: Target; code: string; hidden?: boolean }) {
  const context = usePartContext();
  const { codeLabels } = useWords().words;
  return (
    <PartContext.Provider value={target.item ? { ...context, item: target.item } : context}>
      {hidden ? (
        <NoCopy part={target.part} />
      ) : (
        <KitAction
          action="copy"
          value={code}
          part={target.part}
          kind="quiet"
          icon="clipboard"
          a11y={codeLabels.copy}
          copiedLabel={codeLabels.copied}
          disabled={!code}
        />
      )}
    </PartContext.Provider>
  );
}

function CodeContent({ code, language, label, copyTarget, wrap = false }: CodeProps) {
  const ks = useKitStyle();
  const { codeLabels } = useWords().words;
  const source = <SourceText {...{ code, wrap, language }} />;
  return (
    <>
      <XStack
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={space.md}
        gap={space.sm}
        backgroundColor="$raised"
      >
        <XStack
          flex={component.base.bodyFlex}
          minWidth={component.base.none}
          alignItems="center"
          gap={space.sm}
        >
          {label && (
            <KitText role="label" part={null}>
              {label}
            </KitText>
          )}
          {language && (
            <YStack
              backgroundColor="$surface"
              borderRadius={shifted("sm", ks.radiusShift)}
              paddingHorizontal={space.sm}
            >
              <KitText role="caption" tone="muted" part={null}>
                {language}
              </KitText>
            </YStack>
          )}
        </XStack>
        <CopyButton target={copyTarget} code={code} />
      </XStack>
      {wrap ? (
        <YStack padding={space.md}>{source}</YStack>
      ) : (
        <ScrollView
          horizontal
          contentContainerStyle={{ padding: space.md }}
          accessibilityLabel={label ?? codeLabels.block}
          {...(isWeb ? { tabIndex: 0 } : {})}
        >
          {source}
        </ScrollView>
      )}
    </>
  );
}

/** Displays and copies literal source, never rendered HTML or a wire action value. */
export function KitCodeBlock({ part = "root", loading, ...props }: CodeProps) {
  const { code, language, label, copyTarget } = props;
  const context = usePartContext();
  const busy = loading || context.state === "loading";
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
      {busy || empty ? (
        <>
          <CopyButton target={copyTarget} code="" hidden />
          {busy ? <KitSkeleton shape="pairs" lead="none" rows={2} /> : <RichEmpty />}
        </>
      ) : (
        <CodeContent {...props} />
      )}
    </YStack>
  );
}
