import * as ink from "https://deno.land/x/ink@1.3/mod.ts";
import { readLines } from "https://deno.land/std@0.113.0/io/buffer.ts";

export interface Arguments {
  help: boolean;
  version: boolean;
  verbose: boolean;
  dryRun: boolean;
  overwrite: boolean;
  files: string[];
}

export interface Flags {
  [key: string]: boolean;
}

export async function parseArgs(): Promise<Arguments> {
  const list: string[] = [];
  // Detect piped input
  if (!Deno.isatty(Deno.stdin.rid)) {
    for await (const line of readLines(Deno.stdin)) {
      line && list.push(line);
    }
  }
  const args = [...list, ...Deno.args];
  const files = args.filter((arg) => !arg.startsWith("-"));
  const flags = args.filter((arg) => arg.startsWith("-"));

  const parsedFlags: Flags = flags.reduce((acc, flag) => {
    const key = flag.replace(/^-*/, "");
    acc[key] = true;
    return acc;
  }, {} as Flags);

  return {
    help: parsedFlags["help"] || parsedFlags["h"],
    verbose: parsedFlags["verbose"] || parsedFlags["v"],
    overwrite: parsedFlags["overwrite"] || parsedFlags["o"],
    dryRun: parsedFlags["dry-run"] || parsedFlags["d"],
    version: parsedFlags["version"],
    files,
  };
}

export function printUsage() {
  console.log(ink.colorize(
    `gitignore v1.0.0
Small command-line utility for adding new entries to .gitignore.
This is free software, and you are welcome to redistribute it under the terms of the GPLv3 license.

<yellow>USAGE:</yellow> <green>gitignore</green> <yellow>[options] <file></yellow>...

<yellow>EXAMPLE:</yellow> <green>gitignore</green> <magenta><u>node_modules/</u></magenta> <yellow>\"*.out\"</yellow>

<yellow>OPTIONS:</yellow>
    -v, --verbose    Prints the files that are being added/skipped.
    -o, --overwrite  Overwrites the .gitignore file if it already exists.
    -d, --dry-run    Do not perform I/O operations.
    -h, --help       Prints this help message.
        --version    Prints the version number.

<yellow>NOTE:</yellow> <green>gitignore</green> will not add paths that already exist in .gitignore.`,
  ));
}

export function printVersion() {
  console.log("gitignore v1.0.0");
  console.log("GPLv3");
}
