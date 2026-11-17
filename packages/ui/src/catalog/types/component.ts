export type StateName = "filled" | "empty" | "loading" | "success" | "error";
export type ComponentId = string;
export type Component = { id: string; c: ComponentId; state?: StateName } & Record<string, unknown>;
