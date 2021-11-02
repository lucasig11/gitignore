import { ink, parse, readLines } from "./deps.ts";

export interface Arguments {
  confirm: boolean;
  dryRun: boolean;
  entries: string[];
  help: boolean;
  lang: string;
  overwrite: boolean;
  search: boolean;
  version: boolean;
  verbose: boolean;
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
    confirm,
    dryRun,
    help,
    lang,
    search,
    verbose,
    version,
    _: entries,
    overwrite,
  } = parse(
    [
      ...piped,
      ...Deno.args,
    ],
    {
      boolean: [
        "confirm",
        "help",
        "search",
        "version",
        "verbose",
        "dryRun",
        "overwrite",
      ],
      string: ["lang"],
      alias: {
        d: "dryRun",
        h: "help",
        l: "lang",
        o: "overwrite",
        s: "search",
        v: "verbose",
        V: "version",
        y: "confirm",
      },
    },
  );

  return {
    confirm,
    dryRun,
    entries: entries.map((entry) => entry.toString()),
    help,
    lang,
    overwrite,
    search,
    version,
    verbose,
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
    -y,  --confirm          Skip confirmation prompt.
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
  console.log("v0.1.0");
}
