import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function git(args: string[]) {
  const { stdout } = await execFileAsync("git", args, {
    cwd: process.cwd(),
    maxBuffer: 4 * 1024 * 1024
  });
  return stdout.trim();
}

export async function createAgentBranch(agentName: string, shortTask: string) {
  const slug = shortTask
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const branch = `agent/${agentName}/${slug}`;
  await git(["switch", "-C", branch]);
  return { branch };
}

export async function summarizeBranchChanges() {
  const branch = await git(["branch", "--show-current"]);
  const status = await git(["status", "--short"]);
  const diffStat = await git(["diff", "--stat", "origin/master...HEAD"]).catch(() => git(["diff", "--stat"]));
  const commits = await git(["log", "--oneline", "origin/master..HEAD"]).catch(() => "");
  return { branch, status, diffStat, commits };
}

export async function preparePr(title?: string) {
  const summary = await summarizeBranchChanges();
  return {
    title: title ?? `Agent changes: ${summary.branch}`,
    body: [
      "## Summary",
      "",
      summary.commits || "No commits yet.",
      "",
      "## Diff Stat",
      "",
      "```",
      summary.diffStat || "No diff.",
      "```",
      "",
      "## Safety",
      "",
      "- [ ] Typecheck passed",
      "- [ ] Build passed",
      "- [ ] DB migration impact reviewed",
      "- [ ] Backup impact reviewed",
      "",
      "Opening the PR is an external side effect and should require approval."
    ].join("\n")
  };
}
