import type { Scope } from "./scope";

/** The whole prompt: a brief instruction, the scoped catalog entries, the request. Kept short for small models. */
export function writePrompt(scope: Scope, request: string): string {
  return [
    'You write one phone app screen as JSON: {"lines":[...]}. Each line is one component from the list, in screen order.',
    "Start with a Header. Use 3 to 7 lines. Write short, concrete text about the request. Never use any component not listed.",
    "",
    "Components:",
    scope.entries,
    "",
    `Request: ${request.trim()}`,
  ].join("\n");
}

/** The prompt for the Act step: the screen as text and a task; the schema limits the answer to real actions. */
export function actPrompt(screenText: string, task: string): string {
  return [
    "You operate a phone app. You see the screen as text; each action is in square brackets and starts with its address.",
    'Reply with only JSON: {"address": "<address>", "action": "<action>"}.',
    "",
    screenText,
    "",
    `Task: ${task.trim()}`,
  ].join("\n");
}
