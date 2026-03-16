/**
 * @file checklist.mjs
 * @description CLI wrapper for @diegovelasquezweb/a11y-engine manual testing checklist generator.
 * Generates a standalone interactive HTML checklist — does not depend on scan results.
 *
 * Usage (from SKILL.md Step 6.7):
 *   node $SKILL_DIR/scripts/reports/builders/checklist.mjs --output <path>/checklist.html --base-url <URL>
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const log = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  error: (msg) => console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
};

function printUsage() {
  log.info(`Usage:
  node scripts/reports/builders/checklist.mjs --output <path> [options]

Options:
  --output <path>    Output HTML file path (required)
  --base-url <url>   Target website URL (used as label in the checklist)
  -h, --help         Show this help
`);
}

function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  function getArgValue(name) {
    const entry = argv.find((a) => a.startsWith(`--${name}=`));
    if (entry) return entry.split("=")[1];
    const index = argv.indexOf(`--${name}`);
    if (index !== -1 && argv[index + 1] && !argv[index + 1].startsWith("--")) return argv[index + 1];
    return null;
  }

  const output = getArgValue("output");
  if (!output) {
    log.error("Missing required argument: --output");
    process.exit(1);
  }

  return {
    output: path.isAbsolute(output) ? output : path.resolve(output),
    baseUrl: getArgValue("base-url") || "",
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  log.info("Generating manual testing checklist...");

  const { getChecklist } = await import("@diegovelasquezweb/a11y-engine");

  const { html } = await getChecklist({ baseUrl: args.baseUrl });

  fs.mkdirSync(path.dirname(args.output), { recursive: true });
  fs.writeFileSync(args.output, html, "utf-8");

  log.success(`Checklist saved to ${args.output}`);
  console.log(`CHECKLIST_PATH=${args.output}`);
}

main().catch((error) => {
  log.error(`Checklist Generation Failure: ${error.message}`);
  process.exit(1);
});
