/**
 * @file remediation.mjs
 * @description Regenerates the remediation.md guide from the findings payload.
 * Called after scan-source.mjs to include source pattern findings in the guide.
 *
 * Usage (from SKILL.md Step 3):
 *   node $SKILL_DIR/scripts/remediation.mjs --output <REMEDIATION_PATH> --base-url <URL>
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.join(__dirname, "..");
const AUDIT_DIR = path.join(SKILL_ROOT, ".audit");

const log = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  error: (msg) => console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
};

function printUsage() {
  log.info(`Usage:
  node scripts/reports/builders/md.mjs --output <path> --base-url <url> [options]

Options:
  --output <path>    Output Markdown file path (default: .audit/remediation.md)
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

  return {
    output: getArgValue("output") || path.join(AUDIT_DIR, "remediation.md"),
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

  // Include pattern findings if available (written by source-scanner.mjs)
  const patternFindingsPath = path.join(AUDIT_DIR, "a11y-pattern-findings.json");
  let patternFindings = null;
  if (fs.existsSync(patternFindingsPath)) {
    try {
      patternFindings = JSON.parse(fs.readFileSync(patternFindingsPath, "utf-8"));
    } catch {
      // non-fatal — proceed without pattern findings
    }
  }

  log.info("Generating remediation guide...");

  const { getRemediationGuide } = await import("@diegovelasquezweb/a11y-engine");

  const { markdown } = await getRemediationGuide(payload, {
    baseUrl: args.baseUrl,
    target: args.target,
    patternFindings,
  });

  const outputPath = path.isAbsolute(args.output) ? args.output : path.resolve(args.output);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, markdown, "utf-8");

  log.success(`Remediation guide saved to ${outputPath}`);
  console.log(`REMEDIATION_PATH=${outputPath}`);
}

main().catch((error) => {
  log.error(`Markdown Report Failure: ${error.message}`);
  process.exit(1);
});
