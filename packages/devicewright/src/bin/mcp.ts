#!/usr/bin/env node
import process from 'node:process';
import { startMcpStdio } from '../mcp/server';

startMcpStdio().catch((err) => {
  console.error(err);
  process.exit(1);
});
