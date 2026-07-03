import type { LintReport, LintFinding } from "@/types";

const BOT_MARKER = "<!-- designmd-bot -->";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://driftguard.vercel.app";

const SEVERITY_ICON: Record<string, string> = {
  error: "🔴",
  warning: "🟡",
  info: "🔵",
};

const RULE_DOCS: Record<string, string> = {
  "missing-colors":   "Add a `colors:` section with at least a `primary` token.",
  "missing-primary":  "Add `primary:` under `colors:` so agents have a clear base color.",
  "broken-ref":       "Fix the token reference — it points to a key that doesn't exist.",
  "contrast-ratio":   "Increase contrast between text and background to meet WCAG AA (4.5:1 minimum).",
  "orphaned-tokens":  "Reference this color in a component token, or remove it to keep the spec clean.",
  "missing-typography":"Add a `typography:` section with at least `h1` and `body-md` tokens.",
  "missing-sections": "Consider adding this section for more complete agent guidance.",
  "section-order":    "Reorder sections to match the canonical DESIGN.md spec.",
};

function findingsTable(findings: LintFinding[]): string {
  if (findings.length === 0) return "";
  const header = `| | Severity | Token path | Message |
|---|---|---|---|`;
  const rows = findings.map((f) => {
    const icon = SEVERITY_ICON[f.severity] || "⚪";
    const path = f.line ? `[\`${f.path}\`](# "Line ${f.line}")` : `\`${f.path}\``;
    const hint = RULE_DOCS[f.rule] ? `<br><sub>${RULE_DOCS[f.rule]}</sub>` : "";
    return `| ${icon} | ${f.severity} | ${path} | ${f.message}${hint} |`;
  });
  return `\n${header}\n${rows.join("\n")}`;
}

function fixesSection(findings: LintFinding[]): string {
  const fixable = findings.filter((f) => f.fix);
  if (fixable.length === 0) return "";

  const blocks = fixable.map((f) => {
    const lineText = f.line ? ` (line ${f.line})` : "";
    const title = f.fix?.title ?? "Suggested fix";
    const patch = f.fix?.patch
      ? `\n\nPaste-ready patch:\n\`\`\`yaml\n${f.fix.patch}\n\`\`\``
      : "";
    const suggestion = f.fix?.suggestion
      ? `\n\nGitHub suggestion block (for review comments):\n\`\`\`suggestion\n${f.fix.suggestion}\n\`\`\``
      : "";

    return `#### ${title}\n- Rule: \`${f.rule}\`\n- Path: \`${f.path}\`${lineText}${patch}${suggestion}`;
  });

  return `\n\n### Apply Fix Suggestions\nThese are additive suggestions. Existing lint messages are unchanged.${blocks.join("\n\n")}`;
}

export function buildPRComment(
  report: LintReport,
  repoFullName: string,
  sha: string,
  designMdFound: boolean,
  prUrl: string
): string {
  const shortSha = sha.slice(0, 7);
  const editorUrl = `${APP_URL}/editor`;
  const dashboardUrl = `${APP_URL}/dashboard`;

  // ── No DESIGN.md found ───────────────────────────────────────────────────
  if (!designMdFound) {
    return `${BOT_MARKER}
## designmd · Design system check ℹ️

No \`DESIGN.md\` found at the root of this repository.

A \`DESIGN.md\` file gives AI coding agents (Cursor, Claude Code, Copilot) a persistent design spec — so every component they generate matches your brand's colors, fonts, and spacing.

**Get started in 30 seconds:**
1. [Open the DESIGN.md editor →](${editorUrl}) — describe your brand, AI generates the file
2. Add \`DESIGN.md\` to the root of \`${repoFullName}\`
3. This check will automatically run on the next PR

<sub>Powered by [driftguard.vercel.app](${APP_URL}) · [Dashboard](${dashboardUrl})</sub>`;
  }

  const { summary, findings } = report;
  const { errors, warnings, info } = summary;

  // ── All clear ────────────────────────────────────────────────────────────
  if (errors === 0 && warnings === 0) {
    return `${BOT_MARKER}
## designmd · Design system check ✅

**All checks passed** — \`DESIGN.md\` is valid at \`${shortSha}\`

${info > 0 ? `<details>\n<summary>${info} info finding${info !== 1 ? "s" : ""}</summary>\n${findingsTable(findings.filter(f => f.severity === "info"))}\n</details>` : ""}

<sub>Powered by [driftguard.vercel.app](${APP_URL}) · [Edit design system](${editorUrl}) · [Dashboard](${dashboardUrl})</sub>`;
  }

  // ── Errors or warnings ───────────────────────────────────────────────────
  const statusEmoji = errors > 0 ? "❌" : "⚠️";
  const statusText = errors > 0
    ? `**${errors} error${errors !== 1 ? "s" : ""}** found — merge may be blocked`
    : `**${warnings} warning${warnings !== 1 ? "s" : ""}** — review recommended`;

  const errorFindings = findings.filter(f => f.severity === "error");
  const warnFindings = findings.filter(f => f.severity === "warning");
  const infoFindings = findings.filter(f => f.severity === "info");

  const summaryLine = [
    errors > 0 ? `🔴 ${errors} error${errors !== 1 ? "s" : ""}` : null,
    warnings > 0 ? `🟡 ${warnings} warning${warnings !== 1 ? "s" : ""}` : null,
    info > 0 ? `🔵 ${info} info` : null,
  ].filter(Boolean).join(" · ");

  let body = `${BOT_MARKER}
## designmd · Design system check ${statusEmoji}

${statusText} · checked \`DESIGN.md\` at \`${shortSha}\`

${summaryLine}`;

  if (errorFindings.length > 0) {
    body += `\n\n### Errors\n${findingsTable(errorFindings)}`;
  }
  if (warnFindings.length > 0) {
    body += `\n\n### Warnings\n${findingsTable(warnFindings)}`;
  }
  if (infoFindings.length > 0) {
    body += `\n\n<details>\n<summary>Info (${infoFindings.length})</summary>\n${findingsTable(infoFindings)}\n</details>`;
  }

  body += fixesSection(findings);

  body += `\n\n<sub>Powered by [driftguard.vercel.app](${APP_URL}) · [Edit design system](${editorUrl}) · [Dashboard](${dashboardUrl})</sub>`;

  return body;
}
