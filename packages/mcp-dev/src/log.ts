import process from "node:process";

/** MCP protocol rides on stdout — never log there. */
export function log(...args: unknown[]): void {
  console.error("[mcp-dev]", ...args);
}

export function fatal(message: string, code = 1): never {
  log(message);
  process.exit(code);
}
