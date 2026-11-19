import type { ReactNode } from "react";
import { site } from "../data/site";
import { Logo } from "../brand/Logo";
import { ThemePopover } from "../theme/ThemePopover";

const links: [string, string][] = [
  ["#try", "Try"],
  ["#packs", "Packs"],
  ["#/components", "Components"],
  ["gallery/", "Gallery"],
];

/** `themeSlot` lets the build draw a static stand-in for the theme control when it writes the first HTML. */
export function Header({ themeSlot }: { themeSlot?: ReactNode }) {
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
        {themeSlot ?? <ThemePopover />}
      </div>
    </header>
  );
}
