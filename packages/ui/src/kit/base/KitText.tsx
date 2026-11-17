import { Text, styled } from "tamagui";
import { fontFamilies, type as typography } from "../../catalog";
import { useKitStyle } from "../provider";
import { usePart } from "../part";
import type { ReactNode } from "react";

const Frame = styled(Text, {
  color: "$text",
  variants: {
    textRole: {
      body: { fontSize: typography.body.size, lineHeight: typography.body.lineHeight, fontWeight: typography.body.weight },
      caption: { fontSize: typography.caption.size, lineHeight: typography.caption.lineHeight, fontWeight: typography.caption.weight },
      label: { fontSize: typography.label.size, lineHeight: typography.label.lineHeight, fontWeight: typography.label.weight },
    },
    tone: { text: { color: "$text" }, muted: { color: "$muted" }, accent: { color: "$accent" } },
  } as const,
});
export function KitText({ children, role = "body", tone = "text", part = "root" }: {
  children: ReactNode; role?: "body" | "caption" | "label"; tone?: "text" | "muted" | "accent"; part?: string;
}) {
  const style = useKitStyle();
  return <Frame {...usePart(part)} textRole={role} tone={tone} fontFamily={fontFamilies[style.fonts.text]}>
    {children}
  </Frame>;
}
