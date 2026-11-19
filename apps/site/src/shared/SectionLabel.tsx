/** The left rail of a section: its number and name, and one fact worth knowing, sticky as you read. */
export function SectionLabel({ n, name, note }: { n: string; name: string; note: string }) {
  return (
    <div className="side">
      <p className="label">
        {n} / {name}
      </p>
      <p className="note">{note}</p>
    </div>
  );
}
