#!/usr/bin/env node
import { scaffoldTarget } from './scaffoldTarget';

scaffoldTarget().catch(console.error);
