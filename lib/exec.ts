import { DeployCommandInput } from "./steps/step-input-types/deploy.ts";

export interface Exec {
  run: (command: string, input: DeployCommandInput) => Promise<number>;
}

const run = async (command: string, input: DeployCommandInput): Promise<number> => {
  const commandExec = command.split(" ")[0];
  const commandArgs = command.split(" ").slice(1);

  const { code } = await new Deno.Command(commandExec, { args: commandArgs, stdout: "inherit", stderr: "inherit", env: { "INPUT": JSON.stringify(input) } }).output();

  return code 
}

export const exec: Exec = {
  run,
};