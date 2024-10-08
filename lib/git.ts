import { Exec } from "./exec.ts";
import { GitHubCommit } from "./github-api.ts";
import * as log from "./log.ts";

export interface Git {
  add: ({ exec, filePath }: { exec: Exec; filePath: string }) => Promise<void>;
  commit: (
    { exec, message, dryRun }: { exec: Exec; message: string; dryRun: boolean },
  ) => Promise<GitHubCommit>;
  push: (
    { exec, branch, forcePush, dryRun }: { exec: Exec; branch: string; forcePush: boolean; dryRun: boolean },
  ) => Promise<void>;
  areAnyFilesStaged: ({ exec }: { exec: Exec }) => Promise<boolean>;
  deleteBranch: (
    { exec, branch, dryRun }: { exec: Exec; branch: string; dryRun: boolean },
  ) => Promise<void>;
  checkoutBranch: (
    { exec, branch, createBranchIfNotExist }: { exec: Exec; branch: string; createBranchIfNotExist: boolean },
  ) => Promise<void>;
  doesLocalBranchExist: (
    { exec, branch }: { exec: Exec; branch: string },
  ) => Promise<boolean>;
}

const add = async (
  { exec, filePath }: { exec: Exec; filePath: string },
): Promise<void> => {
  const { exitCode } = await exec.run({
    command: `git add ${filePath}`,
    input: undefined,
  });
  if (exitCode !== 0) {
    throw new Error(`Failed to add file to git: ${filePath}`);
  }
};

const commit = async (
  { exec, message, dryRun }: { exec: Exec; message: string; dryRun: boolean },
): Promise<GitHubCommit> => {
  if (await areAnyFilesStaged({ exec })) {
    // The author is the github actions bot.
    // Resources to find this author info:
    // https://github.com/orgs/community/discussions/26560
    // https://github.com/peter-evans/create-pull-request/blob/0c2a66fe4af462aa0761939bd32efbdd46592737/action.yml
    const { exitCode } = await exec.run({
      command: `git commit -m "${message}"${dryRun ? " --dry-run" : ""}`,
      input: undefined,
      envVars: {
        GIT_AUTHOR_NAME: "github-actions[bot]",
        GIT_COMMITTER_NAME: "github-actions[bot]",
        GIT_AUTHOR_EMAIL:
          "41898282+github-actions[bot]@users.noreply.github.com",
        GIT_COMMITTER_EMAIL:
          "41898282+github-actions[bot]@users.noreply.github.com",
      },
    });
    if (exitCode !== 0) {
      throw new Error(`Failed to commit changes to git: ${message}`);
    }
  }

  return getLatestCommit({ exec });
};

const push = async (
  { exec, branch, forcePush, dryRun }: { exec: Exec; branch: string; forcePush: boolean; dryRun: boolean },
): Promise<void> => {
  const gitCommand = `git push origin ${branch}${forcePush ? " --force" : ""}`;

  if (dryRun) {
    log.message(`[Dry Run] ${gitCommand}`);
    return;
  }

  const { exitCode } = await exec.run({
    command: gitCommand,
    input: undefined,
  });
  if (exitCode !== 0) {
    throw new Error(`Failed to push changes to git: ${branch}`);
  }
};

const areAnyFilesStaged = async (
  { exec }: { exec: Exec },
): Promise<boolean> => {
  const { exitCode, stdout } = await exec.run({
    command: `git diff --cached --name-only`,
    input: undefined,
  });
  if (exitCode !== 0) {
    throw new Error(`Failed to check if any files are staged in git.`);
  }

  return stdout.trim() !== "";
};

const getLatestCommit = async (
  { exec }: { exec: Exec },
): Promise<GitHubCommit> => {
  const { exitCode, stdout } = await exec.run({
    command: `git log -1 --pretty=format:"%H%n%s%n%ci"`,
    input: undefined,
  });
  if (exitCode !== 0) {
    throw new Error(`Failed to get latest commit hash from git.`);
  }

  const [sha, message, dateString] = stdout.trim().split("\n");

  return { sha, message, date: new Date(dateString) };
};

const deleteBranch = async (
  { exec, branch, dryRun }: { exec: Exec; branch: string; dryRun: boolean },
): Promise<void> => {
  const deleteLocalBranchCommand = `git branch -D ${branch}`;

  if (dryRun) {
    log.message(`[Dry Run] ${deleteLocalBranchCommand}`);
  } else {
    const { exitCode } = await exec.run({
      command: deleteLocalBranchCommand,
      input: undefined,
    });
    if (exitCode !== 0) {
      throw new Error(`Failed to delete branch from local: ${branch}`);
    }
  }
}

const checkoutBranch = async (
  { exec, branch, createBranchIfNotExist }: { exec: Exec; branch: string; createBranchIfNotExist: boolean },
): Promise<void> => {
  const { exitCode } = await exec.run({
    command: `git checkout ${createBranchIfNotExist ? "-b " : ""}${branch}`,
    input: undefined,
  });
  if (exitCode !== 0) {
    throw new Error(`Failed to checkout branch: ${branch}`);
  }
}

const doesLocalBranchExist = async (
  { exec, branch }: { exec: Exec; branch: string },
): Promise<boolean> => {
  const { exitCode } = await exec.run({
    command: `git show-ref --verify --quiet refs/heads/${branch}`,
    input: undefined,
  });

  return exitCode === 0;
}

export const git: Git = {
  add,
  commit,
  push,  
  areAnyFilesStaged,
  deleteBranch,
  checkoutBranch,
  doesLocalBranchExist
};
