/** What a code-split page shows while its chunk loads: the shape of the page and a mono status line. */
export function PageSkeleton({ what }: { what: string }) {
  return (
    <main id="main" className="wrap page" aria-busy="true">
      <p className="caption">
        <span>loading the kit…</span>
        <span>{what}</span>
      </p>
      <div className="sk sk-title" />
      <div className="sk sk-line" />
      <div className="pg-grid">
        <div className="sk sk-panel" />
        <div className="sk sk-phone" />
      </div>
    </main>
  );
}
