/** A missing page or id, in the same ruled style as the rest of the site. */
export function NotFound({ what }: { what: string }) {
  return (
    <main id="main" className="wrap page">
      <p className="caption">
        <span>404</span>
        <span>nothing at this address</span>
      </p>
      <div className="notfound">
        <h1>No such page</h1>
        <p className="lede">
          There is no {what}. Addresses in this catalog are exact: screen/component/item/part.
        </p>
        <p className="actions">
          <a className="btn primary" href="#/">
            Home
          </a>
          <a className="textlink" href="#/components">
            Browse the components
          </a>
        </p>
      </div>
    </main>
  );
}
