#!/usr/bin/env bun
import process from 'node:process';

import { attachExample } from './attach';
import {
  type ExampleRel,
  imessageSurfaceMatrix,
  isExampleRel,
  messagesMatrix,
  resolveMatrixEntry,
  shareSheetMatrix,
  stickersMatrix,
} from './matrix';
import { runMatrix } from './run';

function usage(): never {
  console.error(`Usage:
  expo-targets-ios-harness attach <exampleRel>
  expo-targets-ios-harness test [exampleRel...]
  expo-targets-ios-harness test:share-sheet
  expo-targets-ios-harness test:messages
  expo-targets-ios-harness test:stickers
  expo-targets-ios-harness test:imessage-surface

  exampleRel: examples/share|action|native/share|native/action|messages|stickers

  test:imessage-surface is a serial runner alias (Messages ag-handoff then
  Stickers pack-interact) — not a single proof bar.

Env:
  UITEST_SIM_UDID   override pinned simulator (default: machine-local iPhone Air)
  UITEST_*_OVERRIDE override matrix env keys for attach/test
`);
  process.exit(2);
}

function parseExamples(
  args: string[],
  fallback: () => ExampleRel[]
): ExampleRel[] {
  if (args.length === 0) {
    return fallback();
  }
  const out: ExampleRel[] = [];
  for (const arg of args) {
    if (!isExampleRel(arg)) {
      console.error(`unknown example: ${arg}`);
      usage();
    }
    out.push(arg);
  }
  return out;
}

function cmdAttach(rest: string[]): void {
  const example = rest[0];
  if (!(example && isExampleRel(example))) {
    console.error('attach requires a matrix exampleRel');
    usage();
  }
  const result = attachExample(resolveMatrixEntry(example));
  console.log(
    JSON.stringify(
      {
        exampleRel: result.exampleRel,
        schemePath: result.schemePath,
        uiTestCreated: result.uiTestCreated,
        testableAdded: result.testableAdded,
        removedStale: result.removedStale,
      },
      null,
      2
    )
  );
}

function cmdTest(examples: ExampleRel[]): void {
  const result = runMatrix({ exampleRels: examples });
  if (!result.ok) {
    process.exit(result.failed?.exitCode ?? 1);
  }
}

function main(argv: string[]): void {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === '-h' || cmd === '--help') {
    usage();
  }
  if (cmd === 'attach') {
    cmdAttach(rest);
    return;
  }
  if (cmd === 'test') {
    cmdTest(parseExamples(rest, shareSheetMatrix));
    return;
  }
  if (cmd === 'test:share-sheet') {
    cmdTest(shareSheetMatrix());
    return;
  }
  if (cmd === 'test:messages') {
    cmdTest(messagesMatrix());
    return;
  }
  if (cmd === 'test:stickers') {
    cmdTest(stickersMatrix());
    return;
  }
  if (cmd === 'test:imessage-surface') {
    cmdTest(imessageSurfaceMatrix());
    return;
  }
  console.error(`unknown command: ${cmd}`);
  usage();
}

main(process.argv.slice(2));
