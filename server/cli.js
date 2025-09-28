#!/usr/bin/env node
/*
  Simple CLI to analyze a credit report PDF and print JSON.
  Usage: node server/cli.js <path/to/report.pdf> [--pretty]
*/
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { analyzeBuffer } = require('./analyze');

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    console.log('Usage: node server/cli.js <path/to/report.pdf> [--pretty] [--dump-text]');
    process.exit(0);
  }
  const pretty = args.includes('--pretty');
  const dumpText = args.includes('--dump-text');
  const fileArg = args.find((a) => !a.startsWith('-'));
  if (!fileArg) {
    console.error('Error: missing file path');
    process.exit(1);
  }
  const filePath = path.resolve(process.cwd(), fileArg);
  try {
    const buf = await fs.promises.readFile(filePath);
    if (dumpText) {
      const data = await pdfParse(buf);
      console.log(data.text || '');
    } else {
      const result = await analyzeBuffer(buf);
      const json = pretty ? JSON.stringify(result, null, 2) : JSON.stringify(result);
      console.log(json);
    }
  } catch (err) {
    console.error(`Failed: ${err && err.message ? err.message : String(err)}`);
    process.exit(2);
  }
}

main();
