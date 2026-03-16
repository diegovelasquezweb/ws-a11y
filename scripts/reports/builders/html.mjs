/**
 * @file html.mjs
 * @description CLI wrapper for @diegovelasquezweb/a11y-engine HTML report generator.
 * Reads the findings payload from .audit/ and writes an interactive HTML dashboard.
 *
 * Usage (from SKILL.md Step 6.5):
 *   node $SKILL_DIR/scripts/reports/builders/html.mjs --output <path>/report.html --base-url <URL>
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.join(__dirname, "..", "..", "..");
const AUDIT_DIR = path.join(SKILL_ROOT, ".audit");

const log = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  error: (msg) => console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
};

function printUsage() {
  log.info(`Usage:
  node scripts/reports/builders/html.mjs --output <path> --base-url <url> [options]

Options:
  --output <path>    Output HTML file path (required)
  --base-url <url>   Target website URL
  --target <text>    Compliance target label (default: "WCAG 2.2 AA")
  --input <path>     Findings JSON path (default: .audit/a11y-findings.json)
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
    target: getArgValue("target") || "WCAG 2.2 AA",
    input: getArgValue("input") || path.join(AUDIT_DIR, "a11y-findings.json"),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(args.input)) {
    log.error(`Findings file not found: ${args.input}. Run audit first.`);
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(args.input, "utf-8"));
  const screenshotsDir = path.join(AUDIT_DIR, "screenshots");

  log.info("Generating HTML report...");

  const { getHTMLReport } = await import("@diegovelasquezweb/a11y-engine");

  const { html } = await getHTMLReport(payload, {
    baseUrl: args.baseUrl,
    target: args.target,
    screenshotsDir: fs.existsSync(screenshotsDir) ? screenshotsDir : undefined,
  });

  fs.mkdirSync(path.dirname(args.output), { recursive: true });
  fs.writeFileSync(args.output, html, "utf-8");

  log.success(`HTML report saved to ${args.output}`);
  console.log(`REPORT_PATH=${args.output}`);
}

main().catch((error) => {
  log.error(`HTML Report Failure: ${error.message}`);
  process.exit(1);
});
