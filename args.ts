import { ink, parse, readLines } from "./deps.ts";

export interface Arguments {
  clearCache: boolean;
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
    "clear-cache": clearCache,
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
        "clear-cache",
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
        c: "clear-cache",
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
    clearCache,
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

<yellow>USAGE:</yellow>
    $ <green>gitignore</green> <yellow>[FLAGS] [OPTIONS] <FILES></yellow>...

<yellow>OPTIONS:</yellow>
    -l,  --lang=<STRING>    Language/framework to fetch a template for. Ex: react, python, ruby, etc.

<yellow>FLAGS:</yellow>
    -c,  --clear-cache      Clear the cache before fetching the template.
    -y,  --confirm          Skip confirmation prompt.
    -d,  --dry-run          Do not perform I/O operations.
    -o,  --overwrite        Overwrites the .gitignore file if it already exists.
    -v,  --verbose          Prints the files that are being added/skipped.
    -s   --search           Interactively search through the available templates.
    -h,  --help             Prints this help message.
    -V   --version          Prints the version number.

<yellow>EXAMPLES:</yellow>
    $ <green>gitignore</green> <magenta><u>node_modules/</u></magenta> <yellow>\"*.out\"</yellow>
    $ <green>gitignore</green> <cyan>--lang=node</cyan> <yellow>\"*.out\"</yellow>
    $ <green>curl</green> <cyan>-fLw</cyan> <yellow>'\\n'</yellow> https://www.gitignore.io/api/node | <green>gitignore</green> <cyan>-v</cyan>
`,
  ));
}

export function printVersion() {
  console.log("v0.2.0");
}
