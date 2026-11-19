import type { ReactNode } from "react";
import { ErrorBoundary } from "react-error-boundary";

/** What a visitor sees when a page's code could not be loaded: the site chrome stays, with a way forward. */
function Reload() {
  return (
    <main id="main" className="wrap page" role="alert">
      <p className="caption">
        <span>Did not load</span>
        <span>the site may have been updated</span>
      </p>
      <div className="notfound">
        <h1>This page did not load</h1>
        <p className="lede">
          A part of the site could not be fetched, most likely because it was updated while this tab was open.
          Reloading gets the current version.
        </p>
        <p className="actions">
          <button className="btn primary" onClick={() => location.reload()}>
            Reload
          </button>
          <a className="textlink" href="#/">
            Home
          </a>
        </p>
      </div>
    </main>
  );
}

/** Catches a failing page or chunk below it and shows `Reload` instead of a blank screen. */
export function RouteBoundary({ children, route }: { children: ReactNode; route: string }) {
  return (
    <ErrorBoundary FallbackComponent={Reload} resetKeys={[route]}>
      {children}
    </ErrorBoundary>
  );
}
