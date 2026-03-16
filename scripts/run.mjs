/**
 * @file run.mjs
 * @description Entry point for the ws-a11y skill. Parses CLI args and delegates to @diegovelasquezweb/a11y-engine.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.join(__dirname, "..");
const AUDIT_DIR = path.join(SKILL_ROOT, ".audit");

const log = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
  error: (msg) => console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
};

function printUsage() {
  log.info(`Usage:
  node scripts/audit.mjs --base-url <url> [options]

Targeting & Scope:
  --base-url <url>        (Required) The target website to audit.
  --max-routes <num>      Max routes to discover and scan (default: 10).
  --crawl-depth <num>     How deep to follow links during discovery (1-3, default: 2).
  --routes <csv>          Custom list of paths to scan.
  --project-dir <path>    Path to the audited project (for stack auto-detection).

Audit Intelligence:
  --target <text>         Compliance target label (default: "WCAG 2.2 AA").
  --only-rule <id>        Only check for this specific rule ID.
  --ignore-findings <csv> Ignore specific rule IDs.
  --exclude-selectors <csv> Exclude CSS selectors from scan.

Execution & Emulation:
  --color-scheme <val>    Emulate color scheme: "light" or "dark".
  --wait-until <val>      Page load strategy: domcontentloaded|load|networkidle (default: domcontentloaded).
  --framework <val>       Override auto-detected stack (nextjs|gatsby|react|nuxt|vue|angular|astro|svelte|shopify|wordpress|drupal).
  --viewport <WxH>        Viewport dimensions as WIDTHxHEIGHT (e.g., 375x812 for mobile).
  --headed                Run browser in visible mode (overrides headless).
  --skip-patterns         Skip source code pattern scanning even if --project-dir is set.
  --affected-only         Re-scan only routes that had violations in the previous scan.
  --wait-ms <num>         Time to wait after page load (default: 2000).
  --timeout-ms <num>      Network timeout (default: 30000).

  -h, --help              Show this help.
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

  const baseUrl = getArgValue("base-url");
  if (!baseUrl) {
    log.error("Missing required argument: --base-url");
    log.info("Usage: node scripts/audit.mjs --base-url <url> [options]");
    process.exit(1);
  }

  const viewportArg = getArgValue("viewport");
  let viewport = null;
  if (viewportArg) {
    const [w, h] = viewportArg.split("x").map(Number);
    if (w && h) viewport = { width: w, height: h };
  }

  const ignoreFindings = getArgValue("ignore-findings");
  const excludeSelectors = getArgValue("exclude-selectors");

  return {
    baseUrl,
    maxRoutes: getArgValue("max-routes") ? parseInt(getArgValue("max-routes"), 10) : 10,
    crawlDepth: getArgValue("crawl-depth") ? parseInt(getArgValue("crawl-depth"), 10) : 2,
    routes: getArgValue("routes") || undefined,
    projectDir: getArgValue("project-dir") || undefined,
    target: getArgValue("target") || "WCAG 2.2 AA",
    onlyRule: getArgValue("only-rule") || undefined,
    ignoreFindings: ignoreFindings ? ignoreFindings.split(",").map((v) => v.trim()) : undefined,
    excludeSelectors: excludeSelectors ? excludeSelectors.split(",").map((v) => v.trim()) : undefined,
    colorScheme: getArgValue("color-scheme") || undefined,
    waitUntil: getArgValue("wait-until") || undefined,
    framework: getArgValue("framework") || undefined,
    viewport,
    headless: !argv.includes("--headed"),
    skipPatterns: argv.includes("--skip-patterns"),
    affectedOnly: argv.includes("--affected-only"),
    waitMs: getArgValue("wait-ms") ? parseInt(getArgValue("wait-ms"), 10) : undefined,
    timeoutMs: getArgValue("timeout-ms") ? parseInt(getArgValue("timeout-ms"), 10) : undefined,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Ensure engine is installed
  const nodeModulesPath = path.join(SKILL_ROOT, "node_modules");
  if (!fs.existsSync(nodeModulesPath)) {
    log.info("First run detected — installing skill dependencies (one-time setup)...");
    try {
      execSync("pnpm install", { cwd: SKILL_ROOT, stdio: "ignore" });
    } catch {
      execSync("npm install", { cwd: SKILL_ROOT, stdio: "ignore" });
    }
    log.success("Dependencies ready.");
  }

  fs.mkdirSync(AUDIT_DIR, { recursive: true });

  const screenshotsDir = path.join(AUDIT_DIR, "screenshots");
  fs.rmSync(screenshotsDir, { recursive: true, force: true });

  // Resolve --affected-only: narrow routes to those with previous violations
  let effectiveRoutes = args.routes;
  if (args.affectedOnly && !args.routes) {
    const prevScanPath = path.join(AUDIT_DIR, "a11y-findings.json");
    if (fs.existsSync(prevScanPath)) {
      try {
        const prev = JSON.parse(fs.readFileSync(prevScanPath, "utf-8"));
        const affected = (prev.findings || [])
          .map((f) => f.area || f.url)
          .filter(Boolean)
          .filter((v, i, arr) => arr.indexOf(v) === i);
        if (affected.length > 0) {
          effectiveRoutes = affected.join(",");
          log.info(`--affected-only: re-scanning ${affected.length} route(s) with previous violations.`);
        } else {
          log.info("--affected-only: no previous violations found — running full scan.");
        }
      } catch {
        log.info("--affected-only: could not read previous findings — running full scan.");
      }
    } else {
      log.info("--affected-only: no previous scan found — running full scan.");
    }
  }

  // Persist project dir in session file for wrappers to reuse
  const sessionFile = path.join(AUDIT_DIR, "a11y-session.json");
  if (args.projectDir) {
    fs.writeFileSync(sessionFile, JSON.stringify({ project_dir: path.resolve(args.projectDir) }), "utf-8");
  }

  log.info("Starting accessibility audit pipeline...");

  const { runAudit, getRemediationGuide } =
    await import("@diegovelasquezweb/a11y-engine");

  // Run full audit (crawl + scan + analyze + optional source patterns)
  const payload = await runAudit({
    baseUrl: args.baseUrl,
    maxRoutes: args.maxRoutes,
    crawlDepth: args.crawlDepth,
    routes: effectiveRoutes,
    waitMs: args.waitMs,
    timeoutMs: args.timeoutMs,
    headless: args.headless,
    waitUntil: args.waitUntil,
    colorScheme: args.colorScheme,
    viewport: args.viewport,
    onlyRule: args.onlyRule,
    excludeSelectors: args.excludeSelectors,
    ignoreFindings: args.ignoreFindings,
    framework: args.framework,
    projectDir: args.projectDir,
    skipPatterns: args.skipPatterns,
    screenshotsDir,
    onProgress: (step, status, extra) => {
      if (status === "running") log.info(`[${step}] running...`);
      if (status === "done") log.success(`[${step}] done${extra ? ` — ${JSON.stringify(extra)}` : ""}`);
      if (status === "skipped") log.warn(`[${step}] skipped${extra?.reason ? ` — ${extra.reason}` : ""}`);
    },
  });

  // Persist findings JSON for wrappers
  const findingsPath = path.join(AUDIT_DIR, "a11y-findings.json");
  fs.writeFileSync(findingsPath, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`FINDINGS_PATH=${findingsPath}`);

  // Generate remediation guide (always)
  const { markdown } = await getRemediationGuide(payload, {
    baseUrl: args.baseUrl,
    target: args.target,
    patternFindings: payload.patternFindings || null,
  });
  const remediationPath = path.join(AUDIT_DIR, "remediation.md");
  fs.writeFileSync(remediationPath, markdown, "utf-8");
  console.log(`REMEDIATION_PATH=${remediationPath}`);

  log.success("Audit complete.");
}

main().catch((error) => {
  log.error(`Critical Audit Failure: ${error.message}`);
  process.exit(1);
});
