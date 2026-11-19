import { ComponentIndex } from "./ComponentIndex";
import { Hero } from "./Hero";
import { IdeasSection } from "./IdeasSection";
import { LlmSection } from "./LlmSection";
import { PacksSection } from "./PacksSection";
import { StatsStrip } from "./StatsStrip";
import { ThemesSection } from "./ThemesSection";
import { TrySection } from "./TrySection";

export function Landing() {
  return (
    <main>
      <Hero />
      <StatsStrip />
      <IdeasSection />
      <LlmSection />
      <TrySection />
      <PacksSection />
      <ComponentIndex />
      <ThemesSection />
    </main>
  );
}
