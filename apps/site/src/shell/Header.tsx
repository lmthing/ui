import { site } from "../data/site";
import { Logo } from "../brand/Logo";
import { ThemePopover } from "../theme/ThemePopover";

const links: [string, string][] = [
  ["#try", "Try"],
  ["#packs", "Packs"],
  ["#/components", "Components"],
  ["gallery/", "Gallery"],
];

export function Header() {
  return (
    <header className="site-header">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className="wrap bar">
        <a className="brand" href="#/" aria-label="lmthing/ui, home">
          <Logo />
        </a>
        <nav className="nav" aria-label="Main">
          {links.map(([href, label]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
          <a href={`https://github.com/${site.repo}`}>GitHub</a>
        </nav>
        <ThemePopover />
      </div>
    </header>
  );
}
