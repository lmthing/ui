const token = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)/g;

/** A JSON string with light syntax colour. Keys, strings and numbers each get a class. */
export function Json({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(token)) {
    const at = match.index ?? 0;
    parts.push(text.slice(last, at));
    const kind = match[2] ? "k" : match[1] ? "s" : match[3] ? "b" : "n";
    parts.push(
      <span key={at} className={`j-${kind}`}>
        {match[1] ?? match[0]}
        {match[2] ?? ""}
      </span>,
    );
    last = at + match[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}
