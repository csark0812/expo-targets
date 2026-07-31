/**
 * MCP server — thin projection of DeviceSession.
 * Tool names stay compatible with ios-simulator-mcp where practical.
 */

import process from 'node:process';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createSessionRegistry, type SessionRegistry } from './sessions';
import { registerDevicewrightTools } from './tools';

export function createDevicewrightMcpServer(): McpServer {
  const { server } = createDevicewrightMcpServerWithRegistry();
  return server;
}

export function createDevicewrightMcpServerWithRegistry(): {
  server: McpServer;
  registry: SessionRegistry;
} {
  const server = new McpServer({
    name: 'devicewright',
    version: '0.0.0',
  });
  const registry = createSessionRegistry();
  registerDevicewrightTools(server, registry);
  return { server, registry };
}

function wireReleaseHooks(registry: SessionRegistry): void {
  let releasing = false;
  const release = () => {
    if (releasing) return;
    releasing = true;
    void registry.releaseAll();
  };

  process.once('beforeExit', release);
  process.once('SIGINT', () => {
    release();
    process.exit(130);
  });
  process.once('SIGTERM', () => {
    release();
    process.exit(143);
  });
  process.stdin?.once('end', release);
  process.stdin?.once('close', release);
}

export async function startMcpStdio(): Promise<void> {
  const { server, registry } = createDevicewrightMcpServerWithRegistry();
  wireReleaseHooks(registry);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
