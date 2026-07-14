#!/usr/bin/env node
import {cpSync, existsSync, mkdirSync, readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const output = process.argv[2];
if (!output) {
  console.error('Usage: create-project.mjs <output-directory>');
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const template = path.resolve(scriptDir, '..', 'assets', 'remotion-template');
const destination = path.resolve(output);

if (!existsSync(template)) {
  console.error(`Template not found: ${template}`);
  process.exit(1);
}

if (existsSync(destination) && readdirSync(destination).length > 0) {
  console.error(`Destination is not empty: ${destination}`);
  process.exit(1);
}

mkdirSync(destination, {recursive: true});
cpSync(template, destination, {recursive: true, errorOnExist: true});
console.log(destination);
