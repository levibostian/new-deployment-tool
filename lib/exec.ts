import { DeployCommandInput, DeployCommandOutput, isDeployCommandOutput } from "./steps/types/deploy.ts";
import * as log from "./log.ts";
import * as shellQuote from "npm:shell-quote@1.8.1";

export interface Exec {
  run: (command: string, input: DeployCommandInput) => Promise<{exitCode: number, stdout: string, output: DeployCommandOutput | undefined}>;
}

/*
Executes a command and returns the exit code and the stdout of the command.

The entire command is passed in as 1 string. This is for convenience but also because when used as a github action, the commands will be passed to the tool as a single string.
Then, the command is split into the command and the arguments. This is required by Deno.Command.
You cannot simply split the string by spaces to create the args list. Example, if you're given: `python3 -c "import os; print(os.getenv('INPUT'))"` we expect only 2 args: "-c" and "import ...". 
We use a popular package to parse the string into the correct args list. See automated tests to verify that this works as expected. 

To make this function testable, we not only have the stdout and stderr be piped to the console, but we return it from this function so tests can verify the output of the command.
*/
const run = async (command: string, input: DeployCommandInput): Promise<{exitCode: number, stdout: string, output: DeployCommandOutput | undefined}> => {
  const execCommand = command.split(" ")[0]
  const execArgs = shellQuote.parse(command.replace(new RegExp(`^${execCommand}\\s*`), ''));

  // For some features to work, we need to communicate with the command. We need to send data to it and read data that it produces. 
  // We use JSON as the data format to communicate with the command since pretty much every language has built-in support for it. 
  // Since we are creating subprocesses to run the command, we are limited in how we can communicate with the command. 
  // One common way would be to ask the subprocess to stdout a JSON string that we simply read, but this tool tries to promote stdout 
  // as a way to communicate with the user, not the tool. So instead, we write the JSON to a file and pass the file path to the command.
  const tempFilePathToCommunicateWithCommand = await Deno.makeTempFile({ prefix: "new-deployment-tool-", suffix: ".json" });
  await Deno.writeTextFile(tempFilePathToCommunicateWithCommand, JSON.stringify(input));

  // We want to capture the stdout of the command but we also want to stream it to the console. By using streams, this allows us to 
  // output the stdout/stderr to the console in real-time instead of waiting for the command to finish before we see the output.
  const process = new Deno.Command(execCommand, { args: execArgs, stdout: "piped", stderr: "piped", env: { "DATA_FILE_PATH": tempFilePathToCommunicateWithCommand } })

  const child = process.spawn();

  let capturedStdout = "";

  child.stdout.pipeTo(new WritableStream({
    write(chunk) {
      const decodedChunk = new TextDecoder().decode(chunk);
      log.message(decodedChunk);
      capturedStdout += decodedChunk.trimEnd();
    }
  }))
  child.stderr.pipeTo(new WritableStream({
    write(chunk) {
      const decodedChunk = new TextDecoder().decode(chunk);
      log.error(decodedChunk);
    }
  }))

  const code = (await child.status).code;

  let commandOutput: DeployCommandOutput | undefined = undefined

  const commandOutputUntyped = JSON.parse(await Deno.readTextFile(tempFilePathToCommunicateWithCommand))
  if (isDeployCommandOutput(commandOutputUntyped)) { // there is a chance that the command did not write to the file or they have a bug. 
    commandOutput = commandOutputUntyped;
  }

  return {
    exitCode: code,
    stdout: capturedStdout,
    output: commandOutput,
  } 
}

export const exec: Exec = {
  run,
};