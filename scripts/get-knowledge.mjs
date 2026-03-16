/**
 * @file get-knowledge.mjs
 * @description Prints the full engine knowledge payload to stdout.
 * Used by ws-dev/frontend to access intelligence.json and code-patterns.json
 * data without reading internal engine assets directly.
 *
 * Usage:
 *   node ~/.claude/skills/ws-a11y/scripts/get-knowledge.mjs
 */

const { getKnowledge } = await import("@diegovelasquezweb/a11y-engine");

const knowledge = getKnowledge();
process.stdout.write(JSON.stringify(knowledge, null, 2));
