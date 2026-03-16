# ws-a11y

Accessibility audit sub-skill for the [WS Coding Workflows](https://github.com/Wondersauce/claude-code-plugin) plugin. Part of the ws-* skill family alongside ws-orchestrator, ws-dev, and ws-verifier.

Runs a WCAG 2.2 AA audit (axe-core DOM scan + source code pattern scan) against a live dev server. Classifies findings by task scope, delegates all fixes to `ws-dev/frontend`, and re-audits after each fix cycle. Powered by [@diegovelasquezweb/a11y-engine](https://www.npmjs.com/package/@diegovelasquezweb/a11y-engine).

## Usage

Invoked by ws-orchestrator after every frontend task, or called directly:

```
Audit accessibility localhost:3000
```

```
/ws-a11y https://localhost:3000
```

## How It Fits

```
ws-orchestrator
    └── Task(ws-a11y)               ← audit + classify + delegate
            └── Task(ws-dev/frontend)    ← applies fixes
```

ws-a11y never modifies code. All fixes are delegated to `ws-dev/frontend` with structured findings as input.

## Deliverables

| Format | When |
| :----- | :--- |
| Remediation guide (`.md`) | Always — generated after every audit |
| HTML dashboard (`.html`) | On request — interactive findings with severity filters |
| PDF compliance report (`.pdf`) | On request — formal document for stakeholders |
| Manual checklist (`.html`) | On request — WCAG checks that automation cannot detect |

## Full Documentation

See the [WS Coding Workflows README](https://github.com/Wondersauce/claude-code-plugin#ws-a11y) for scope classification, pass/fail thresholds, finding types, and orchestrator integration.
