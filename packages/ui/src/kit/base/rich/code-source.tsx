import { isIos } from "@tamagui/core";
import { isWeb, ScrollView, Text, YStack, styled } from "tamagui";
import { component, space, type as typography } from "../../../catalog";
import { useWords } from "../../provider";

const Source = styled(Text, {
  fontFamily: component.codeFont[isIos ? "ios" : isWeb ? "web" : "android"],
  fontSize: typography.label.size,
  lineHeight: typography.label.lineHeight,
});
const lexicalLanguage = /^(js|jsx|javascript|ts|tsx|typescript|json)$/i;
const lexicalToken =
  /(\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\\r\n])*"|'(?:\\.|[^'\\\r\n])*'|`(?:\\.|[^`\\])*`|\b(?:const|let|var|async|await|return|if|else|function|class|import|export|from|new|true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b)/g;

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

export function CodeSource({ code, wrap, loading, language, label }: SourceProps) {
  const { codeLabels, placeholderDetail } = useWords().words;
  const text = (
    <Source
      color={loading ? "$line" : "$text"}
      userSelect={loading ? "none" : "text"}
      aria-hidden={loading || undefined}
      accessibilityElementsHidden={loading}
      {...(isWeb
        ? {
            tag: loading ? "span" : "code",
            style: { whiteSpace: wrap ? "pre-wrap" : "pre", overflowWrap: wrap ? "anywhere" : "normal" },
          }
        : {})}
    >
      {loading ? skeletonRuns(code || placeholderDetail) : sourceRuns(code, language)}
    </Source>
  );
  if (wrap) return <YStack padding={space.md}>{text}</YStack>;
  return (
    <ScrollView
      horizontal
      scrollEnabled={!loading}
      contentContainerStyle={{ padding: space.md }}
      accessibilityLabel={loading ? undefined : (label ?? codeLabels.block)}
      {...(isWeb ? { tabIndex: loading ? -1 : 0 } : {})}
    >
      {text}
    </ScrollView>
  );
}
