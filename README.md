# ws-a11y

Runs a WCAG 2.2 AA audit against a live dev server. Classifies findings by task scope, delegates all fixes to `ws-dev/frontend`, and re-audits after each fix cycle. Powered by [@diegovelasquezweb/a11y-engine](https://www.npmjs.com/package/@diegovelasquezweb/a11y-engine).

## Usage

```
/ws-a11y https://localhost:3000
```

## How It Fits

```
Task(ws-a11y)
    └── Task(ws-dev/frontend)
```

ws-a11y never modifies code. All fixes are delegated to `ws-dev/frontend`.

## Integration with ws-dev/frontend

The remediation guide is written to `.ws-session/a11y-remediation.md` in the project root after every audit. `ws-dev/frontend` reads it from there to understand what to fix.
