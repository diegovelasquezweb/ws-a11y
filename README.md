# ws-a11y


Runs a WCAG 2.2 AA audit against a live dev server. Classifies findings by task scope, delegates all fixes to `ws-dev/frontend`, and re-audits after each fix cycle. Powered by [@diegovelasquezweb/a11y-engine](https://www.npmjs.com/package/@diegovelasquezweb/a11y-engine).

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

ws-a11y delegates all fixes to `ws-dev/frontend` via `Task()`. When `--project-dir` is provided, the remediation guide is written to `.ws-session/a11y-remediation.md` inside the project — the same directory all ws-* skills use for session state. `ws-dev/frontend` reads it from there to understand what to fix, implements the changes, and returns results to ws-a11y for re-audit.

