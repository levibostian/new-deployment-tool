import {
  assertEquals,
  assertThrows,
  assertRejects,
  assertStringIncludes,
  assertFalse
} from "jsr:@std/assert@1";
import { afterEach, beforeEach, describe, it } from "jsr:@std/testing@1/bdd";
import {
  restore,
  stub,
  assertSpyCallArg,
  assertSpyCall,
  assertSpyCalls
} from "jsr:@std/testing@1/mock";
import { exec, RunResult } from "./exec.ts";
import { git } from "./git.ts";
import { GitHubCommit } from "./github-api.ts";

describe("add", () => {
  afterEach(() => {
    restore();
  });

  it("should execute the expected command, given a file path", async () => {
    const execMock = stub(exec, "run", async(args) => {
      return { exitCode: 0, stdout: "success", output: undefined }
    })
    const filePath = "file.txt";

    await git.add({ exec, filePath });

    assertSpyCall(execMock, 0, { args: [{command: `git add file.txt`, input: undefined }]});
  })

  it("should throw an error, given the command fails", async () => {
    stub(exec, "run", async (args) => {
      return { exitCode: 1, stdout: "error", output: undefined }
    })

    assertRejects(async () => {
      await git.add({ exec, filePath: "file.txt" });
    }, Error);
  })
})

describe("commit", () => {
  afterEach(() => {
    restore();
  });

  it("should execute the expected command, given a message", async () => {
    const execMock = stub(exec, "run", async(args) => {
      return { exitCode: 0, stdout: "success", output: undefined }
    })
    const message = "commit message";

    await git.commit({ exec, message, dryRun: false });

    assertSpyCall(execMock, 1, { args: [{command: `git commit -m "commit message" --author="github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>"`, input: undefined }]});
  })

  it("should throw an error, given the command fails", async () => {
    stub(exec, "run", async (args) => {
      return { exitCode: 1, stdout: "error", output: undefined }
    })

    assertRejects(async () => {
      await git.commit({ exec, message: "commit message", dryRun: false });
    }, Error);
  })

  it("should run command in dry-mode when enabled", async () => {
    const execMock = getExecMock({
      getStagedFilesResult: { exitCode: 0, stdout: "file.txt\n", output: undefined }, // return staged files 
      commitReturn: { exitCode: 0, stdout: "", output: undefined },
      getLatestCommitResult: "anyCommit"
    })

    await git.commit({ exec, message: "commit message", dryRun: true });
    assertSpyCall(execMock, 1, { args: [{command: `git commit -m "commit message" --author="github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>" --dry-run`, input: undefined }]});

    await git.commit({ exec, message: "commit message", dryRun: false });
    assertSpyCall(execMock, 4, { args: [{command: `git commit -m "commit message" --author="github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>"`, input: undefined }]});
  })

  it("should run commit if files are staged", async () => {
    const execMock = getExecMock({
      getStagedFilesResult: { exitCode: 0, stdout: "file.txt\n", output: undefined }, // return staged files 
      commitReturn: { exitCode: 0, stdout: "", output: undefined },
      getLatestCommitResult: "anyCommit"
    })

    await git.commit({ exec, message: "commit message", dryRun: false });

    assertEquals(execMock.calls.filter(call => call.args[0].command.includes("git commit")).length, 1)
  })

  it("should not run commit if no files are staged", async () => {
    const execMock = getExecMock({
      getStagedFilesResult: { exitCode: 0, stdout: "", output: undefined }, // no staged files
      commitReturn: { exitCode: 0, stdout: "", output: undefined },
      getLatestCommitResult: "anyCommit"
    })

    await git.commit({ exec, message: "commit message", dryRun: false });

    execMock.calls.forEach(call => {
      assertFalse(call.args[0].command.includes("commit")) // assert no commit command was run
    });
  })

  it("should return the latest commit", async () => {
    const expectedCommit = { sha: "a5f75a52fac139f823ccdcb4ea30976e9130ce4d", message: "message goes here", date: new Date("2024-09-01 07:42:24 -0500") }

    getExecMock({
      getStagedFilesResult: { exitCode: 0, stdout: "file.txt\n", output: undefined },
      commitReturn: { exitCode: 0, stdout: "", output: undefined },
      getLatestCommitResult: { exitCode: 0, stdout: `a5f75a52fac139f823ccdcb4ea30976e9130ce4d\nmessage goes here\n2024-09-01 07:42:24 -0500`, output: undefined }
    })

    const actualCommit = await git.commit({ exec, message: "commit message", dryRun: false });

    assertEquals(actualCommit, expectedCommit);
  })
})

describe("push", () => {
  afterEach(() => {
    restore();
  });

  it("should execute the expected command, given a branch", async () => {
    const execMock = stub(exec, "run", async(args) => {
      return { exitCode: 0, stdout: "success", output: undefined }
    })
    const branch = "main";

    await git.push({ exec, branch, dryRun: false });
    assertSpyCall(execMock, 0, { args: [{command: `git push origin main`, input: undefined }]});
  })

  it("should throw an error, given the command fails", async () => {
    stub(exec, "run", async (args) => {
      return { exitCode: 1, stdout: "error", output: undefined }
    })

    assertRejects(async () => {
      await git.push({ exec, branch: "main", dryRun: false });
    }, Error);
  })

  it("should run command in dry-mode when enabled", async () => {
    const execMock = stub(exec, "run", async(args) => {
      return { exitCode: 0, stdout: "success", output: undefined }
    })

    await git.push({ exec, branch: "main", dryRun: true });
    assertSpyCall(execMock, 0, { args: [{command: `git push origin main --dry-run`, input: undefined }]});

    await git.push({ exec, branch: "main", dryRun: false });
    assertSpyCall(execMock, 1, { args: [{command: `git push origin main`, input: undefined }]});
  })
})

const getExecMock = ({getLatestCommitResult, getStagedFilesResult, commitReturn, pushReturn}: {getLatestCommitResult: RunResult | "anyCommit", getStagedFilesResult: RunResult | "noFiles", commitReturn?: RunResult, pushReturn?: RunResult}) => {
  return stub(exec, "run", async(args) => {
    if (args.command.includes("git log")) {
      if (getLatestCommitResult === "anyCommit") { return { exitCode: 0, stdout: `a5f75a52fac\nmessage goes here\n2024-09-01 07:42:24 -0500`, output: undefined } } 

      return getLatestCommitResult
    }
    if (args.command.includes("git diff")) { 
      if (getStagedFilesResult === "noFiles") { return { exitCode: 0, stdout: "", output: undefined } }

      return getStagedFilesResult
    }
    if (args.command.includes("git commit")) {
      if (!commitReturn) { throw Error("forgot to stub") }
      return commitReturn
    }
    if (args.command.includes("git push")) {
      if (!pushReturn) { throw Error("forgot to stub") }
      return pushReturn
    }

    throw Error("unexpected command")
  })
}