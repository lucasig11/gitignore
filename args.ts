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
  search: boolean;
  entries: string[];
}

export interface Flags {
  [key: string]: boolean;
}

export async function parseArgs(): Promise<Arguments> {
  const piped: string[] = [];

  if (!Deno.isatty(Deno.stdin.rid)) {
    for await (const line of readLines(Deno.stdin)) {
      line && piped.push(line);
    }
  }

  const {
    lang,
    search,
    help,
    verbose,
    version,
    dryRun,
    _: entries,
    overwrite,
  } = parse(
    [
      ...piped,
      ...Deno.args,
    ],
    {
      boolean: ["help", "search", "version", "verbose", "dryRun", "overwrite"],
      string: ["lang"],
      alias: {
        h: "help",
        l: "lang",
        s: "search",
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
    search,
    lang,
    entries: entries.map((entry) => entry.toString()),
  };
}

export function printUsage() {
  printVersion();
  console.log(ink.colorize(
    `Small command-line utility for adding new entries to .gitignore.
This is free software, and you are welcome to redistribute it under the terms of the GPLv3 license.

<yellow>USAGE:    </yellow><green>gitignore</green> <yellow>[FLAGS] [OPTIONS] <FILES></yellow>...

<yellow>OPTIONS:</yellow>
    -l,  --lang=<STRING>    Language/framework to fetch a template for. Ex: react, python, ruby, etc.

<yellow>FLAGS:</yellow>
    -d,  --dry-run          Do not perform I/O operations.
    -o,  --overwrite        Overwrites the .gitignore file if it already exists.
    -v,  --verbose          Prints the files that are being added/skipped.
    -s   --search           Lists the available templates and lets you pick one.
    -h,  --help             Prints this help message.
    -V   --version          Prints the version number.

<yellow>EXAMPLES:  </yellow><green>gitignore</green> <magenta><u>node_modules/</u></magenta> <yellow>\"*.out\"</yellow>
           <green>curl</green> <cyan>-fLw</cyan> <yellow>'\\n'</yellow> https://www.gitignore.io/api/node | <green>gitignore</green> <cyan>-v</cyan>`,
  ));
}

export function printVersion() {
  console.log("v0.1");
}
