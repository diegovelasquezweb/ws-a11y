---
name: ws-a11y
description: "Audits and fixes website accessibility (WCAG 2.2 AA) using automated scanning (axe-core + Playwright). Use when the user asks to audit a URL for accessibility, check WCAG compliance, fix a11y issues, test screen reader support, verify keyboard navigation, check color contrast, fix ARIA attributes, add alt text, fix heading hierarchy, improve focus management, check ADA/WCAG compliance, or generate an accessibility report. Trigger keywords: accessibility, a11y, WCAG, ADA, screen reader, assistive technology, accessibility audit, color contrast, alt text, ARIA. Do NOT use for performance audits, SEO, Lighthouse scores, or non-web platforms."
compatibility: Requires Node.js 18+, pnpm (npm as fallback), and internet access. Playwright + Chromium are auto-installed on first run.
argument-hint: "[URL to audit]"
---

# Web Accessibility Audit — ws-a11y

## Resource Map

Load these files on demand — never preload all at once.

| Resource                    | Load when                                                      | Path                                                               |
| --------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------ |
| Report & evidence standards | Step 3 — presenting findings · Step 6 item 1 — console summary | `~/.claude/skills/ws-a11y/references/report-standards.md`          |
| CLI flags reference         | Before running audit — need non-default flags                  | `~/.claude/skills/ws-a11y/references/cli-reference.md`             |
| Quality gates               | Any phase boundary — verifying gate pass/fail                  | `~/.claude/skills/ws-a11y/references/quality-gates.md`             |
| Troubleshooting             | Any script failure                                             | `~/.claude/skills/ws-a11y/references/troubleshooting.md`           |

## Constraints

These rules apply at all times, independent of any workflow step.

- **`remediation.md` is the fix map — do not go outside it.** All findings, fix instructions, source file locations, guardrails, and component map come from the remediation guide generated in Step 2. Never derive a solution from general WCAG knowledge — if it is not in the remediation guide, it is out of scope for this session.
- **Never apply fixes directly** — all code changes are delegated to `ws-dev/frontend` via `Task(ws-dev/frontend)`. ws-a11y audits, classifies, presents decisions, and controls the fix cycle. It never edits source files.
- Never install, remove, or initialize packages in the user's project. The audit script handles dependency installation automatically on first run.
- All pipeline files (scan results, findings, remediation guide, screenshots) stay inside the skill directory — never in the user's project.
- Visual reports (HTML/PDF) are only created in Step 6, after the user explicitly requests them. Never generate reports in any other step.
- Never modify engine scripts to hardcode project-specific exclusions.
- Never declare "100% accessible" based on a targeted audit.
- Treat scripts as black boxes: run with `--help` to discover flags. Do not read script source.
- If `pnpm` is not available, use `npm` as fallback.
- Never add, remove, or modify CLI flags without the user explicitly requesting it.
- Only propose fixes inside the primary editable frontend source of truth. If a finding points to backend code, infrastructure, or any non-editable area, report it or ask the user before proceeding.
- **Never create a new file without explicit approval.** If a fix requires creating a file, show the full proposed content and ask:

  `[QUESTION]` **This fix requires creating `[path]` — proceed?**

  1. **Yes** — create the file
  2. **No** — skip this fix

  Wait for the answer before creating anything.

## Communication Rules

1. **Language** — always communicate in English, regardless of the language the user writes in.
2. **Tone** — concise and technical. State findings, propose action, ask for a decision.
3. **Internal steps** — never expose internal step labels, phase codes, or workflow reasoning to the user. Always describe outcomes in plain language only. **Never pre-announce a sequence of steps** — execute immediately and let the output speak for itself.
4. **Recovery** — if the user types `continue`, `resume`, or `where are we`, read the conversation history to determine the current state and resume from the next pending action.
5. **Message tags** — this playbook uses two tags:
   - `[QUESTION]` — a user-facing question with numbered options. **Send one `[QUESTION]` per message. Never present two questions at once. Always wait for the user's answer before showing the next question.**
   - `[MESSAGE]` — a mandatory pre-written message. **You MUST output the exact text — never skip, rephrase, summarize, or adapt it.** A `[MESSAGE]` does NOT end the agent's turn. Immediately output whatever comes next in the same response.
6. **Data-first** — if the user's message already contains the answer to a pending question, skip that question and proceed directly.

---

## Workflow

Follow these steps sequentially — **never skip a step**, even if the user provides information ahead of time.

```
Progress:
- [ ] Step 1: Page discovery
- [ ] Step 2: Run audit
- [ ] Step 3: Present findings + request permission
- [ ] Step 4: Fix (structural → style) via ws-dev/frontend
- [ ] Step 5: Verification re-audit
- [ ] Step 6: Deliver results
```

### Step 1 — Page discovery

**Hard stop — URL required before anything else.** If no URL is present in the current message, ask: *"What URL should I audit?"* and wait for the answer.

Once the user provides a URL, normalize it:
- `localhost:3000` → `http://localhost:3000`
- `mysite.com` → `https://mysite.com`
- Full URLs → use as-is.

Check if it contains a non-root path:
- **Non-root path present** — treat as a 1-page audit automatically. Use the full URL as `--base-url` with `--max-routes 1`. Skip the scope question and proceed to Step 2.

If root-only, silently fetch `<URL>/sitemap.xml`:
- **Found** — inform the user ("Found a sitemap with N pages — using it for the audit") and proceed to Step 2. No question needed.
- **Not found** — proceed silently to the scope question below.

`[QUESTION]` **How many pages should I crawl?**

1. **1 page** — audit a single specific URL (fastest)
2. **10 pages** — covers main page types, fast
3. **All reachable pages** — comprehensive, may take several minutes on large sites
4. **Custom** — tell me the exact number

If option 1: ask *"Which page? Type `home` for the root, or a path like `about` or `contact`."* and wait. If Custom: ask *"How many pages?"* and wait for a number. **Never use the option number (4) as the page count.**

Store the user's choice. Proceed to Step 2.

### Step 2 — Run the audit

Set `SKILL_DIR` to `~/.claude/skills/ws-a11y`. Run:

```bash
# Default (sitemap or 10-page crawl)
node $SKILL_DIR/scripts/audit.mjs --mode standalone --base-url <URL>

# Single page
node $SKILL_DIR/scripts/audit.mjs --mode standalone --base-url <URL> --max-routes 1

# All pages or custom count
node $SKILL_DIR/scripts/audit.mjs --mode standalone --base-url <URL> --max-routes <N>
```

Always pass `--project-dir <path>` for local projects. Always include `--skip-patterns` — source code pattern scanning is offered separately in Step 6. If you can identify the stack, also pass `--framework <value>`.

After completion, parse `REMEDIATION_PATH` from script output and read that file. **Fallback**: if `REMEDIATION_PATH` is absent, read `$SKILL_DIR/.audit/remediation.md` directly. Do not share internal file paths with the user.

If the script fails, consult troubleshooting reference before asking the user. If unrecoverable, offer: (1) Retry, (2) Different URL, (3) Skip and troubleshoot manually.

### Step 3 — Present findings and request permission

Load report-standards reference for finding field requirements.

Read the remediation guide. The audit pipeline has already handled deduplication, false positive filtering, and computed the Overall Assessment — read these directly from the report.

If a finding is marked with `ownership_status: outside_primary_source` or `ownership_status: unknown`, flag it inline:
> ⚠ This issue may be outside the primary editable source. Confirm whether to ignore it or handle it outside the main remediation flow.

Then ask: **Skip this finding or fix it anyway?** — 1. Skip · 2. Fix anyway.

Apply this decision tree to override severity when automated classification is inaccurate:

```
Can the user complete the task?
├── No → Is there a workaround?
│        ├── No → CRITICAL
│        └── Yes, but difficult → SERIOUS
└── Yes → Is the experience degraded?
          ├── Significantly → MODERATE
          └── Slightly → MINOR
```

Then summarize and present:

1. State the **Overall Assessment** from the report header. Then state the **full scan total** — all axe violations across all severities. Format: "N findings (X Critical, Y Serious, Z Moderate, W Minor)."
2. Propose specific fixes from the remediation guide.
3. Group by component or page area.
4. Ask how to proceed:

`[QUESTION]` **How would you like to proceed?**

1. **Fix by severity** — Critical first, then Serious → Moderate → Minor
2. **Other criteria** — tell me how you'd like to prioritize the fixes
3. **Yolo** — apply all fixes without confirmation gates, re-audit automatically, repeat until clean or 3 cycles
4. **Skip fixes** — don't fix anything right now

Default (if user says "fix" or "go ahead") is **Fix by severity**. If the user chooses **Fix by severity**, **Other criteria**, or **Yolo**, proceed immediately to Step 4.

If the user chooses **Skip fixes**:

`[MESSAGE]` Understood. Keep in mind that the unresolved issues affect real users — screen reader users may not be able to navigate key sections, and keyboard-only users could get trapped. Accessibility is also a legal requirement under ADA Title II (US), Section 508 (US Federal), the European Accessibility Act (EU), the UK Equality Act, and the Accessible Canada Act, among others. These findings will remain available if you decide to revisit them later.

`[QUESTION]` **Are you sure you want to skip all fixes?**

1. **Yes, skip** — proceed to the final summary without applying any fixes
2. **No, let's fix them** — go back and apply the fixes

If **Yes, skip**: proceed to Step 6. If **No, let's fix them**: return to the `[QUESTION]` above and treat the answer as **Fix by severity**.

**0 issues found** → proceed to Step 6. Note: automated tools cannot catch every barrier; recommend manual checks.

### Step 4 — Fix via ws-dev/frontend

**Before starting any fix**, scan all findings and identify those that cannot be auto-fixed (architectural change required, third-party component, confirmed false positive). State them upfront in a single block:

`[MESSAGE]` **The following issue(s) cannot be auto-fixed and will remain after this session:**
- `[rule-id]` · [route] — [one-line explanation]

Then proceed with all fixable findings.

Run structural fixes first, then style fixes. Both must run — never skip one because the user declined fixes in the other.

- **Fix by severity**: process findings Critical → Serious → Moderate → Minor.
- **Other criteria**: follow the user's specified prioritization.
- **Yolo**: delegate all fixes (structural + style) to `ws-dev/frontend` in a single call without confirmation gates. After fixes are applied, immediately run the re-audit (Step 5) with `--affected-only`. Repeat up to 3 cycles, then proceed to Step 6.

  **Before entering yolo mode**, run `git status --porcelain` in `--project-dir`. If there are uncommitted changes, warn the user and ask:

  `[QUESTION]` **Uncommitted changes detected. Continue anyway?**
  1. **Yes, continue** — proceed with yolo
  2. **Let me commit first** — pause here

#### Structural fixes (Critical → Serious → Moderate → Minor)

Safe to delegate — no visual changes (ARIA attributes, alt text, labels, DOM order, lang, heading hierarchy).

> **Scope boundary**: covers only non-visual fixes. Color contrast, font-size, spacing, and any CSS/style property changes are **always** handled in the style pass — regardless of severity.

If there are no structural findings, skip directly to the style pass.

Present one group at a time — list the findings and proposed changes, then ask:

`[QUESTION]` **Apply these [severity] fixes?**

1. **Yes** — delegate all to ws-dev/frontend
2. **Let me pick** — show me the full list, I'll choose by number
3. **No** — skip this group

If **Yes** or after **Let me pick** completes:

```
Task(ws-dev/frontend) with:
  iteration_findings: [array of structural findings with a11y: true]
  Each finding includes: rule_id, wcag_criterion, severity, fix_type: "structural",
    fix_description, fix_code, framework_notes, file_search_pattern, component_hint,
    selector, false_positive_risk, guardrails
```

After ws-dev/frontend completes, list files changed, then ask:

`[QUESTION]` **Please verify visually — does everything look correct?**

1. **Looks good**
2. **Something's wrong** — tell me what to revert or adjust

If **Looks good**: proceed to the style pass. If **Something's wrong**: ask ws-dev/frontend to apply corrections, then proceed.

#### Style fixes (color contrast, font size, spacing, focus styles)

If there are no style findings, skip directly to Step 5.

> **Hard stop before any style change**: these fixes change the site's appearance. **Never delegate any style change before showing the exact proposed diff and receiving an explicit "yes".** This gate applies even if the user previously said "fix all" and even if the finding is Critical severity. No exceptions.

**Color selection rules — mandatory for every contrast fix:**
1. **Never change hue** — only adjust lightness. Convert to HSL and shift L only until the ratio passes.
2. **Minimum change** — smallest L adjustment that reaches the required ratio (4.5:1 normal text, 3:1 large text/UI).
3. **Prefer existing tokens** — check if another token already passes the ratio against the same background.
4. **Never invent new tokens** — only modify an existing token or apply a one-off inline override.

**For each color-contrast finding, run this diagnostic before proposing any fix:**
1. Read the DOM evidence from the remediation guide.
2. **Check for `transition-colors`** — if present, target the specific state class, not the global token.
3. **Find the source of the color token** — read `metadata.projectContext` from `$SKILL_DIR/.audit/a11y-findings.json` to confirm the detected stack.
4. **Check for opacity interference** — flag as high false-positive risk if present.
5. **Check for specificity overrides** — search for inline styles or higher-specificity selectors.

Open with: **"Structural fixes done — reviewing color contrast, font sizes, and spacing. Changes here will affect the visual appearance of your site."** Then show all style changes using this format:

```
Root cause: [problem description with actual values and ratios]
Affected elements:
[/page-path] — [element descriptions with selector/class]

Proposed change — [file path]:
· --token-name: current value (#hex) → proposed value (#hex)  (X.XX:1 → ~Y.YY:1)

Scope: [explain whether global token or local change, and what other elements it affects]
```

Then ask:

`[QUESTION]` **Apply these style changes?**

1. **Yes** — delegate all to ws-dev/frontend
2. **Let me pick** — show me the full list, I'll choose by number
3. **No** — skip style fixes

If **Yes** or after **Let me pick** completes:

```
Task(ws-dev/frontend) with:
  iteration_findings: [array of style findings with a11y: true]
  Each finding includes: rule_id, wcag_criterion, severity, fix_type: "style",
    fix_description, fix_code, framework_notes, file_search_pattern, component_hint,
    selector, false_positive_risk, guardrails
```

After ws-dev/frontend completes, list files and exact values modified, then ask:

`[QUESTION]` **Please verify visually — does everything look correct?**

1. **Looks good**
2. **Something's wrong** — tell me what to revert or adjust

If **Looks good**: proceed to Step 5. If **Something's wrong**: ask ws-dev/frontend to apply corrections, then proceed to Step 5.

### Step 5 — Verification re-audit (mandatory)

This step is **mandatory** — always run it after fixes, no exceptions. If no fixes were applied in Step 4 (user skipped all sub-steps), skip this step and proceed to Step 6.

**Never generate reports in this step.**

**Immediately run the script — do not output any message before running it:**

```bash
node $SKILL_DIR/scripts/audit.mjs --mode standalone --base-url <URL> --max-routes <N> --skip-patterns --affected-only
```

> **Flag parity is mandatory.** Use the exact same flags as Step 2 plus `--affected-only`.

After the script completes, parse results and present immediately:

- **All clear (0 issues)** → proceed to Step 6.
- **Issues found** → follow this sequence:

  1. Present delta: **"`{resolved}` resolved / `{remaining}` remaining / `{new}` new"** — always all three values. `{resolved}` = Step 2 total − current remaining (cumulative). If `{new} > 0`, explain: *"New issues are expected after fixing parent violations — axe-core evaluates child elements for the first time once the parent is resolved."*

  2. `[QUESTION]` **The re-audit shows [N] issue(s) remaining. How would you like to proceed?**

     1. **Keep fixing** — address all remaining issues
     2. **Let me pick** — show me the list, I'll choose which to fix
     3. **Move on** — accept the remaining issues and proceed to the final summary

  3. If **Keep fixing**: compare remaining against previously fixed findings. If same `rule_id` + `route` persists, flag: *"The fix for [rule] on [route] did not take effect — likely CSS specificity override, wrong file, or value in a config. This needs manual investigation."* Exclude from this cycle. Apply remaining fixable findings following Step 4 procedures. Then immediately re-run audit — no text before it.
  4. If **Let me pick**: present numbered list, apply selected fixes following Step 4, re-run audit.
  5. If **Move on**: proceed to Step 6 immediately.

Repeat fix+re-audit up to **3 cycles total**. If issues persist after 3 cycles, list remaining and proceed to Step 6 without asking.

**Do not proceed to Step 6 until: the re-audit is clean, the user explicitly chooses to move on, or 3 cycles are exhausted.**

### Step 6 — Deliver results

**All items in this step are mandatory and must execute in order (1 → 8). Never stop after the summary.**

> **File-open rule**: verify the file exists on disk before reporting success. Attempt to open with `open` (macOS), `xdg-open` (Linux), or `start` (Windows). In headless environments, share the absolute path.

1. **Summarize**: load report-standards reference and present the **Console Summary Template**. All metric values must come from the Step 5 re-audit results. `resolved` = Step 2 total − Step 5 remaining. `remaining` = issue count in Step 5 output.

2. **Passed Criteria**: read the `## Passed WCAG 2.2 Criteria` section from the remediation guide and present it as-is.

3. If `--project-dir` was provided, ask:

`[QUESTION]` **Scan source code patterns?**

The source scanner checks your **entire codebase** for issues axe-core cannot detect at runtime — suppressed focus outlines, autoplay attributes, missing `prefers-reduced-motion` queries, and more.

1. **Yes** — run source code pattern scan
2. **No thanks** — skip

If **Yes**, run in order:
```bash
node $SKILL_DIR/scripts/engine/source-scanner.mjs --project-dir <path> [--framework <val>]
node $SKILL_DIR/scripts/reports/builders/md.mjs --output <REMEDIATION_PATH> --base-url <URL>
```

Present new findings from "Source Code Pattern Findings" section, grouped by severity.

If findings found, ask:

`[QUESTION]` **Source scan found [N] pattern type(s) across [M] locations. Would you like to fix them?**

1. **Fix all** — delegate all pattern fixes to ws-dev/frontend
2. **Let me pick** — show me the list, I'll choose which to fix
3. **Skip** — move on without fixing

If **Fix all** or **Let me pick**: delegate to `Task(ws-dev/frontend)` with pattern findings as `iteration_findings`. After fixes applied, re-run source scanner to verify and present delta.

4. Output the manual testing reminder — **only if at least one fix was applied during this session**:

`[MESSAGE]` Automated tools cannot catch every accessibility barrier. The following are the most critical checks that require human judgment — please verify them manually.

- [ ] **Keyboard navigation** — Tab through all interactive elements; verify visible focus ring and no keyboard traps.
- [ ] **Screen reader** — Test with VoiceOver (macOS) or NVDA (Windows); verify headings, landmarks, forms, and modals are announced correctly.
- [ ] **Media** — Prerecorded video has accurate captions and an audio description track; audio-only content has a text transcript.
- [ ] **Motion & timing** — `prefers-reduced-motion` is respected; no content flashes >3×/sec; auto-playing content has a pause control.
- [ ] **Forms & errors** — Error messages give specific correction guidance; financial/legal submissions have a confirmation step.

5. Output the closing message and follow-up question in the same response. If the user skipped all fixes, skip the `[MESSAGE]` and go directly to the `[QUESTION]`.

`[MESSAGE]` Great work! By investing in accessibility, you're making your site usable for everyone — including people who rely on screen readers, keyboard navigation, and assistive technology. That commitment matters and sets your project apart. Accessibility isn't a one-time task, so consider scheduling periodic re-audits as your site evolves. Keep it up!

`[QUESTION]` **Is there anything else I can help you with?**

1. **Yes** — start a new audit
2. **No, goodbye**


If **Yes**: discard all session state and restart from Step 1. If **No, goodbye**: the workflow is complete.

---

## Edge Cases

### Authentication & Restricted Pages

1. Do not guess credentials or attempt brute-force access.
2. Report blocked routes (401/403 or login redirect).
3. Ask the user: provide session cookies, test credentials, or skip those routes.
4. Use credentials for the audit session only. Do not persist to disk.
