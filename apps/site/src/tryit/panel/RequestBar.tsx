type Props = {
  request: string;
  setRequest: (request: string) => void;
  suggestions: string[];
  running: boolean;
  run: (request: string) => void;
  stop: () => void;
};

/** The request box, Build and Stop, and the prefilled suggestions. */
export function RequestBar({ request, setRequest, suggestions, running, run, stop }: Props) {
  return (
    <>
      <div className="ask">
        <input
          type="text"
          aria-label="What should the app be?"
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !running && run(request)}
        />
        <button className="btn primary" disabled={running || !request.trim()} onClick={() => run(request)}>
          {running ? "Writing..." : "Build"}
        </button>
        {running && (
          <button className="btn" onClick={stop}>
            Stop
          </button>
        )}
      </div>
      <div className="chips">
        {suggestions.map((s) => (
          <button key={s} className="chip pick" onClick={() => setRequest(s)}>
            {s}
          </button>
        ))}
      </div>
    </>
  );
}
