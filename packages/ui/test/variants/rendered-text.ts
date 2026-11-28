export const decode = (text: string) =>
  text.replace(
    /&amp;|&#x27;|&#39;|&quot;|&lt;|&gt;/g,
    (entity) =>
      ({ "&amp;": "&", "&#x27;": "'", "&#39;": "'", "&quot;": '"', "&lt;": "<", "&gt;": ">" })[entity]!,
  );

const voidTags = /^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i;

/** Visible data includes marked visual text with a separate equivalent screen-reader label. */
export function visibleTexts(html: string): string[] {
  const body = html.replace(/<style[\s\S]*?<\/style>/g, "");
  const texts: string[] = [];
  let hidden = 0;
  for (const token of body.split(/(<[^>]+>)/)) {
    if (!token.startsWith("<")) {
      const text = decode(token).trim();
      if (text && hidden === 0) texts.push(text);
      continue;
    }
    const value = /^<input\b/i.test(token) ? token.match(/\bvalue="([^"]*)"/)?.[1] : undefined;
    if (value && hidden === 0) texts.push(decode(value).trim());
    const closing = token.startsWith("</");
    const selfClosing = token.endsWith("/>") || voidTags.test(token);
    if (hidden > 0) hidden += closing ? -1 : selfClosing ? 0 : 1;
    else if (
      !closing &&
      !selfClosing &&
      /aria-hidden="true"/.test(token) &&
      !/data-kit-visual-reading=/.test(token)
    )
      hidden = 1;
  }
  return texts;
}
