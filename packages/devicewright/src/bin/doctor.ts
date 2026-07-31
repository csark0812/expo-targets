#!/usr/bin/env node
import process from 'node:process';
import { formatDoctor, runDoctor } from '../doctor';

const requireAndroid = process.argv.includes('--android');
const report = runDoctor({ requireAndroid });
console.log(formatDoctor(report));
process.exit(report.ok ? 0 : 1);
