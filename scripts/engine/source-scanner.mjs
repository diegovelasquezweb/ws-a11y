/**
 * @file source-scanner.mjs
 * @description CLI wrapper for @diegovelasquezweb/a11y-engine source pattern scanner.
 * Scans a project's source code for accessibility issues not detectable by axe-core at runtime.
 *
 * Usage (from SKILL.md Step 6.6):
 *   node $SKILL_DIR/scripts/engine/source-scanner.mjs --project-dir <path> [--framework <val>]
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.join(__dirname, "..", "..");
const AUDIT_DIR = path.join(SKILL_ROOT, ".audit");

const log = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
  error: (msg) => console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
};

function printUsage() {
  log.info(`Usage:
  node scripts/engine/source-scanner.mjs --project-dir <path> [options]

Options:
  --project-dir <path>    Path to the project source root to scan (required)
  --framework <val>       Override auto-detected framework
  --output <path>         Output JSON path (default: .audit/a11y-pattern-findings.json)
  --only-pattern <id>     Only run a specific pattern ID
  -h, --help              Show this help
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

  const projectDir = getArgValue("project-dir");
  if (!projectDir) {
    log.error("Missing required argument: --project-dir");
    process.exit(1);
  }

  return {
    projectDir: path.resolve(projectDir),
    framework: getArgValue("framework") || undefined,
    output: getArgValue("output") || path.join(AUDIT_DIR, "a11y-pattern-findings.json"),
    onlyPattern: getArgValue("only-pattern") || undefined,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  fs.mkdirSync(AUDIT_DIR, { recursive: true });

  log.info(`Scanning source code at: ${args.projectDir}`);

  const { getSourcePatterns } = await import("@diegovelasquezweb/a11y-engine");

  const result = await getSourcePatterns(args.projectDir, {
    framework: args.framework,
    onlyPattern: args.onlyPattern,
  });

  const output = {
    generated_at: new Date().toISOString(),
    project_dir: args.projectDir,
    findings: result.findings,
    summary: result.summary,
  };

  fs.writeFileSync(args.output, JSON.stringify(output, null, 2), "utf-8");

  const { total, confirmed, potential } = result.summary;
  log.success(
    `Pattern scan complete. ${confirmed} confirmed, ${potential} potential (${total} total). Saved to ${args.output}`,
  );

  console.log(`PATTERN_FINDINGS_PATH=${args.output}`);
}

main().catch((error) => {
  log.error(`Source Scanner Failure: ${error.message}`);
  process.exit(1);
});
