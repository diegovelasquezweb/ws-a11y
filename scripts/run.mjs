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

function parseArgs(argv) {
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
    process.exit(1);
  }

  const projectDir = getArgValue("project-dir");
  if (!projectDir) {
    log.error("Missing required argument: --project-dir");
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
  const maxRoutes = getArgValue("max-routes");
  const crawlDepth = getArgValue("crawl-depth");
  const waitMs = getArgValue("wait-ms");
  const timeoutMs = getArgValue("timeout-ms");

  return {
    baseUrl,
    maxRoutes: maxRoutes ? parseInt(maxRoutes, 10) : 10,
    crawlDepth: crawlDepth ? parseInt(crawlDepth, 10) : 2,
    routes: getArgValue("routes") || undefined,
    projectDir,
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
    waitMs: waitMs ? parseInt(waitMs, 10) : undefined,
    timeoutMs: timeoutMs ? parseInt(timeoutMs, 10) : undefined,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

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

  let effectiveRoutes = args.routes;
  if (args.affectedOnly && !args.routes) {
    const prevScanPath = path.join(AUDIT_DIR, "a11y-findings.json");
    if (fs.existsSync(prevScanPath)) {
      try {
        const prev = JSON.parse(fs.readFileSync(prevScanPath, "utf-8"));
        const affected = [...new Set((prev.findings || []).map((f) => f.area || f.url).filter(Boolean))];
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

  log.info("Starting accessibility audit pipeline...");

  const { runAudit, getRemediationGuide } =
    await import("@diegovelasquezweb/a11y-engine");

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
    onProgress: (step, status, extra) => {
      if (status === "running") log.info(`[${step}] running...`);
      if (status === "done") log.success(`[${step}] done${extra ? ` — ${JSON.stringify(extra)}` : ""}`);
      if (status === "skipped") log.warn(`[${step}] skipped${extra?.reason ? ` — ${extra.reason}` : ""}`);
    },
  });

  const findingsPath = path.join(AUDIT_DIR, "a11y-findings.json");
  fs.writeFileSync(findingsPath, JSON.stringify(payload, null, 2), "utf-8");

  const { markdown } = await getRemediationGuide(payload, {
    baseUrl: args.baseUrl,
    target: args.target,
    patternFindings: payload.patternFindings || null,
  });

  const wsSessionDir = path.join(path.resolve(args.projectDir), ".ws-session");
  fs.mkdirSync(wsSessionDir, { recursive: true });
  const remediationPath = path.join(wsSessionDir, "a11y-remediation.md");
  fs.writeFileSync(remediationPath, markdown, "utf-8");
  console.log(`REMEDIATION_PATH=${remediationPath}`);

  log.success("Audit complete.");
}

main().catch((error) => {
  log.error(`Critical Audit Failure: ${error.message}`);
  process.exit(1);
});
