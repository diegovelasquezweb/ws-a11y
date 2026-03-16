# ws-a11y


Runs a WCAG 2.2 AA audit (axe-core DOM scan + source code pattern scan) against a live dev server. Classifies findings by task scope, delegates all fixes to `ws-dev/frontend`, and re-audits after each fix cycle. Powered by [@diegovelasquezweb/a11y-engine](https://www.npmjs.com/package/@diegovelasquezweb/a11y-engine).

## Usage

Run directly when you want an accessibility audit:

```
Audit accessibility localhost:3000
```

```
/ws-a11y https://localhost:3000
```

## How It Fits

```
Task(ws-a11y)               ← audit + classify + delegate
    └── Task(ws-dev/frontend)    ← applies fixes
```

ws-a11y never modifies code. All fixes are delegated to `ws-dev/frontend` with structured findings as input.

## Deliverables

| Format | When |
| :----- | :--- |
| Remediation guide (`.md`) | Always — generated after every audit |

## Integration with ws-dev/frontend

ws-a11y delegates all fixes to `ws-dev/frontend` via `Task()`. For the integration to work correctly, `ws-dev/frontend` needs to handle two things:

### 1. Receiving iteration_findings

When ws-a11y invokes `Task(ws-dev/frontend)`, it passes findings as `iteration_findings`. The frontend skill should treat these as the sole source of truth for that iteration — not re-read the full remediation guide.

Each finding includes: `rule_id`, `title`, `severity`, `selector`, `fix_description`, `fix_code`, `fix_code_lang`, `file_search_pattern`, `ownership_status`, `guardrails`, and `verification_command`.

### 2. Accessing engine knowledge

The intelligence data (`intelligence.json`, `code-patterns.json`) that `ws-dev/frontend` uses for proactive accessibility checks **no longer lives at** `~/.claude/skills/ws-a11y/assets/`. It is now internal to the engine.

To access it, run:

```bash
node ~/.claude/skills/ws-a11y/scripts/get-knowledge.mjs
```

This prints the full engine knowledge payload to stdout — same data, engine-sourced.

