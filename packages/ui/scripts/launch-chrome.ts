import { chromium, type LaunchOptions } from "playwright-core";

export function chromePaths(env: NodeJS.ProcessEnv = process.env): string[] {
  return [
    env.CHROME,
    "/usr/bin/google-chrome",
    env.HOME ? `${env.HOME}/.local/bin/google-chrome` : undefined,
    "/usr/bin/chromium-browser",
  ].filter((path): path is string => Boolean(path));
}

export async function launchChrome(options: LaunchOptions = {}) {
  for (const executablePath of chromePaths()) {
    try {
      return await chromium.launch({ headless: true, ...options, executablePath });
    } catch {
      /* try the next installation */
    }
  }
  throw new Error("No Chrome found. Set CHROME to a Chrome or Chromium binary.");
}
