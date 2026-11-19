import { site } from "../data/site";
import { Mark } from "../brand/Logo";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <Mark size={24} animate={false} />
        <p>
          lmthing/ui is the component catalog and kit behind lmthing. Built {site.built} from{" "}
          <a href={`https://github.com/${site.repo}/commit/${site.commit}`}>{site.commit}</a>; every count,
          status and example on this site is read from the repository at build time.
        </p>
        <p>
          <a href={`https://github.com/${site.repo}`}>Source</a> · <a href="gallery/">Static gallery</a> ·{" "}
          <a href="#/components">All components</a>
        </p>
      </div>
    </footer>
  );
}
