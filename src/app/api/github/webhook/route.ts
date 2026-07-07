import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhookSignature,
  getInstallationOctokit,
  fetchFileContent,
  upsertPRComment,
  findExistingComment,
  setCommitStatus,
} from "@/lib/github";
import {
  parseDesignMd,
  lintDesignMd,
  extractCanonicalTokensFromDesignSystem,
  extractCanonicalTokensFromCssVariables,
  validateDesignTokensAgainstCss,
} from "@/lib/linter";
import { buildPRComment } from "@/lib/comment";
import {
  upsertInstallation,
  deleteInstallation,
  upsertMonitoredRepo,
  removeMonitoredRepo,
  getMonitoredRepo,
  logPrCheck,
} from "@/lib/db";
import type { WebhookPayload } from "@/types";

const CSS_TOKEN_PATH_CANDIDATES = [
  "src/app/globals.css",
  "app/globals.css",
  "styles/globals.css",
  "src/styles/globals.css",
];

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256") ?? "";
  const event = req.headers.get("x-github-event") ?? "";

  // ── Verify signature ────────────────────────────────────────────────────
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── Route by event type ─────────────────────────────────────────────────
  try {
    switch (event) {
      case "installation":
        await handleInstallation(payload);
        break;
      case "installation_repositories":
        await handleInstallationRepositories(payload);
        break;
      case "pull_request":
        await handlePullRequest(payload);
        break;
      default:
        // Ignore other events
    }
  } catch (err) {
    console.error(`[webhook] ${event} handler error:`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// ─── Installation created / deleted ─────────────────────────────────────────

async function handleInstallation(payload: WebhookPayload) {
  const { action, installation, sender, repositories, repositories_added } = payload;

  if (action === "created") {
    await upsertInstallation({
      id: installation.id,
      user_id: sender.login,
      account_login: sender.login,
      account_type: sender.type as "User" | "Organization",
      account_avatar_url: sender.avatar_url ?? "",
      suspended: false,
    });

    // installation.created sends repos under "repositories", not "repositories_added"
    for (const repo of repositories ?? repositories_added ?? []) {
      await upsertMonitoredRepo({
        installation_id: installation.id,
        user_id: sender.login,
        repo_full_name: repo.full_name,
        repo_id: repo.id,
        enabled: true,
        block_on_error: false,
      });
    }
  }

  if (action === "deleted") {
    await deleteInstallation(installation.id);
  }

  if (action === "suspend") {
    const { createServiceClient } = await import("@/lib/db");
    const db = createServiceClient();
    await db.from("github_installations").update({ suspended: true }).eq("id", installation.id);
  }

  if (action === "unsuspend") {
    const { createServiceClient } = await import("@/lib/db");
    const db = createServiceClient();
    await db.from("github_installations").update({ suspended: false }).eq("id", installation.id);
  }
}

// ─── Repos added / removed from installation ────────────────────────────────

async function handleInstallationRepositories(payload: WebhookPayload) {
  const { installation, repositories_added, repositories_removed } = payload;

  for (const repo of repositories_added ?? []) {
    await upsertMonitoredRepo({
      installation_id: installation.id,
      user_id: "",
      repo_full_name: repo.full_name,
      repo_id: repo.id,
      enabled: true,
      block_on_error: false,
    });
  }

  for (const repo of repositories_removed ?? []) {
    await removeMonitoredRepo(repo.id);
  }
}

// ─── Pull request opened / updated ──────────────────────────────────────────

async function handlePullRequest(payload: WebhookPayload) {
  const { action, pull_request, repository, installation } = payload;

  if (!pull_request || !repository) return;
  if (!["opened", "synchronize", "reopened"].includes(action)) return;

  const owner = repository.owner.login;
  const repo = repository.full_name.split("/")[1];
  const repoFullName = repository.full_name;
  const prNumber = pull_request.number;
  const sha = pull_request.head.sha;
  const ref = pull_request.head.ref;

  // Check if this repo is enabled
  const monitoredRepo = await getMonitoredRepo(repoFullName);
  // Still run even if not in DB (first-time install) — just don't block merge

  const octokit = await getInstallationOctokit(installation.id);

  // Set pending status immediately
  await setCommitStatus(octokit, owner, repo, sha, "pending", "Checking DESIGN.md…");

  // Fetch DESIGN.md from the PR branch
  const content = await fetchFileContent(octokit, owner, repo, "DESIGN.md", ref);

  let commentBody: string;
  let statusState: "success" | "failure" = "success";
  let checkStatus: "passed" | "warned" | "failed" | "no_file" = "no_file";
  let errors = 0;
  let warnings = 0;

  if (!content) {
    commentBody = buildPRComment(
      { findings: [], summary: { errors: 0, warnings: 0, info: 0 } },
      repoFullName, sha, false, pull_request.html_url
    );
    checkStatus = "no_file";
  } else {
    const parsed = parseDesignMd(content);

    if (!parsed) {
      const parseErrorReport = {
        findings: [{
          severity: "error" as const,
          rule: "parse-error",
          path: "DESIGN.md",
          message: "Could not parse DESIGN.md — check YAML front matter. Ensure the file starts and ends with `---`.",
        }],
        summary: { errors: 1, warnings: 0, info: 0 },
      };
      commentBody = buildPRComment(parseErrorReport, repoFullName, sha, true, pull_request.html_url);
      statusState = "failure";
      checkStatus = "failed";
      errors = 1;
    } else {
      const report = lintDesignMd(parsed);

      const cssContents = await Promise.all(
        CSS_TOKEN_PATH_CANDIDATES.map((cssPath) =>
          fetchFileContent(octokit, owner, repo, cssPath, ref)
        )
      );
      const cssTokens = cssContents
        .filter((c): c is string => Boolean(c))
        .flatMap((c) => extractCanonicalTokensFromCssVariables(c));
      const designTokens = extractCanonicalTokensFromDesignSystem(parsed.tokens);
      const tokenReport = validateDesignTokensAgainstCss(designTokens, cssTokens);

      const mergedReport = {
        findings: [
          ...report.findings,
          ...tokenReport.findings.map((f) => ({
            severity: f.severity,
            rule: f.rule,
            path: f.tokenPath,
            message:
              f.expected || f.actual
                ? `${f.message}<br><sub>${[
                    f.expected ? `<strong>Expected:</strong> \`${f.expected}\`` : null,
                    f.actual ? `<strong>Actual:</strong> \`${f.actual}\`` : null,
                  ].filter(Boolean).join(" · ")}</sub>`
                : f.message,
          })),
        ],
        summary: {
          errors: report.summary.errors + tokenReport.summary.errors,
          warnings: report.summary.warnings + tokenReport.summary.warnings,
          info: report.summary.info + tokenReport.summary.info,
        },
      };
      errors = mergedReport.summary.errors;
      warnings = mergedReport.summary.warnings;

      commentBody = buildPRComment(mergedReport, repoFullName, sha, true, pull_request.html_url);

      if (errors > 0) {
        statusState = monitoredRepo?.block_on_error ? "failure" : "success";
        checkStatus = "failed";
      } else if (warnings > 0) {
        statusState = "success";
        checkStatus = "warned";
      } else {
        statusState = "success";
        checkStatus = "passed";
      }
    }
  }

  // Find existing comment to update (avoid spam)
  const existingCommentId = await findExistingComment(octokit, owner, repo, prNumber);

  // Post / update comment and set final status in parallel
  await Promise.all([
    upsertPRComment(octokit, owner, repo, prNumber, commentBody, existingCommentId),
    setCommitStatus(
      octokit, owner, repo, sha, statusState,
      statusState === "success"
        ? errors > 0
          ? `DESIGN.md has ${errors} error${errors !== 1 ? "s" : ""} (not blocking)`
          : warnings > 0
          ? `DESIGN.md has ${warnings} warning${warnings !== 1 ? "s" : ""}`
          : "DESIGN.md looks good"
        : `DESIGN.md has ${errors} error${errors !== 1 ? "s" : ""} — fix before merging`
    ),
  ]);

  // Log the check result
  await logPrCheck({
    repo_full_name: repoFullName,
    pr_number: prNumber,
    pr_title: pull_request.title ?? `PR #${prNumber}`,
    sha,
    branch: ref,
    status: checkStatus,
    errors,
    warnings,
    checked_at: new Date().toISOString(),
  });
}
