/**
 * MCP server — thin projection of DeviceSession.
 * Tool names stay compatible with ios-simulator-mcp where practical.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import type { DeviceSession } from '../session';
import { registerDevicewrightTools } from './tools';

export function createDevicewrightMcpServer(): McpServer {
  const server = new McpServer({
    name: 'devicewright',
    version: '0.0.0',
  });
  const holder: { current: DeviceSession | null } = { current: null };
  registerDevicewrightTools(server, holder);
  return server;
}

export async function startMcpStdio(): Promise<void> {
  const server = createDevicewrightMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
