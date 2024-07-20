export const getCurrentBranchName = async () => {
  return await runGitCommand(["rev-parse", "--abbrev-ref", "HEAD"]);
}

const runGitCommand = async (args: string[]) => {
  const command = new Deno.Command("git", {
    args: args,
    stdout: "piped",
  });
  const { code, stdout } = await command.output();
  if (code === 0) {
    return new TextDecoder().decode(stdout).trim();
  } else {
    throw new Error(`Git command failed with code ${code}`);
  }
}