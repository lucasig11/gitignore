import * as ink from "https://deno.land/x/ink@1.3/mod.ts";
import { readLines } from "https://deno.land/std@0.113.0/io/buffer.ts";
import { parse } from "https://deno.land/std@0.113.0/flags/mod.ts";

export interface Arguments {
  help: boolean;
  version: boolean;
  verbose: boolean;
  dryRun: boolean;
  overwrite: boolean;
  lang: string;
  entries: string[];
}

export interface Flags {
  [key: string]: boolean;
}

export async function parseArgs(): Promise<Arguments> {
  const list: string[] = [];

  if (!Deno.isatty(Deno.stdin.rid)) {
    for await (const line of readLines(Deno.stdin)) {
      line && list.push(line);
    }
  }

  const { lang, help, verbose, version, dryRun, _: entries, overwrite } = parse(
    [
      ...list,
      ...Deno.args,
    ],
    {
      boolean: ["help", "version", "verbose", "dryRun", "overwrite"],
      string: ["lang"],
      alias: {
        h: "help",
        l: "lang",
        v: "verbose",
        V: "version",
        d: "dryRun",
        o: "overwrite",
      },
    },
  );

  return {
    help,
    verbose,
    overwrite,
    dryRun,
    version,
    lang,
    entries: entries.map((entry) => entry.toString()),
  };
}

export function printUsage() {
  console.log(ink.colorize(
    `gitignore v1.0.0
Small command-line utility for adding new entries to .gitignore.
This is free software, and you are welcome to redistribute it under the terms of the GPLv3 license.

<yellow>USAGE:    </yellow><green>gitignore</green> <yellow>[FLAGS] [OPTIONS] <FILES></yellow>...

<yellow>OPTIONS:</yellow>
    -l,  --lang=<STRING>    Language/framework to fetch a template for. Ex: react, python, ruby, etc.

<yellow>FLAGS:</yellow>
    -d,  --dry-run          Do not perform I/O operations.
    -o,  --overwrite        Overwrites the .gitignore file if it already exists.
    -v,  --verbose          Prints the files that are being added/skipped.
    -h,  --help             Prints this help message.
    -V   --version          Prints the version number.

<yellow>EXAMPLES:  </yellow><green>gitignore</green> <magenta><u>node_modules/</u></magenta> <yellow>\"*.out\"</yellow>
           <green>curl</green> <cyan>-fLw</cyan> <yellow>'\\n'</yellow> https://www.gitignore.io/api/node | <green>gitignore</green> <cyan>-v</cyan>`,
  ));
}

export function printVersion() {
  console.log("gitignore v1.0.0");
  console.log("GPLv3");
}
