
export interface Exec {
  run: (command: string) => Promise<number>;
}

const run = async (command: string): Promise<number> => {
  const commandExec = command.split(" ")[0];
  const commandArgs = command.split(" ").slice(1);

  const { code } = await new Deno.Command(commandExec, { args: commandArgs, stdout: "inherit", stderr: "inherit" }).output();

  return code 
}

export const exec: Exec = {
  run,
};