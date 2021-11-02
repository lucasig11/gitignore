//! Small command-line utility for adding new entries to `.gitignore`.
/// deno install --allow-read --allow-write mod.ts
import * as ink from "https://deno.land/x/ink@1.3/mod.ts";
import { readLines } from "https://deno.land/std/io/buffer.ts";

interface Arguments {
  help: boolean;
  version: boolean;
  verbose: boolean;
  dry_run: boolean;
  files: string[];
}

interface Flags {
  [key: string]: boolean;
}

async function parseArgs(): Promise<Arguments> {
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
    version: parsedFlags["version"],
    verbose: parsedFlags["verbose"] || parsedFlags["v"],
    dry_run: parsedFlags["dry-run"],
    files,
  };
}

function printUsage() {
  console.log(ink.colorize(
    `gitignore v1.0.0
Small command-line utility for adding new entries to .gitignore.
This is free software, and you are welcome to redistribute it under the terms of the GPLv3 license.

<yellow>USAGE:</yellow> <green>gitignore</green> <yellow>[options] <file></yellow>...

<yellow>EXAMPLE:</yellow> <green>gitignore</green> <magenta><u>node_modules/</u></magenta> <yellow>\"*.out\"</yellow>

<yellow>OPTIONS:</yellow>
    -v, --verbose    Prints the files that are being added/skipped.
        --dry-run    Do not perform I/O operations.
    -h, --help       Prints this help message.
        --version    Prints the version number.

<yellow>NOTE:</yellow> <green>gitignore</green> will not add paths that already exist in .gitignore.`,
  ));
}

function printVersion() {
  console.log("gitignore v1.0.0");
  console.log("GPLv3");
}

// Get the list of files that are already ignored
async function getIgnoredFiles(): Promise<string[]> {
  try {
    const content = await Deno.readFile(".gitignore");
    const lines = new TextDecoder().decode(content).split("\n");
    return lines;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return [];
    }
    throw e;
  }
}

let VERBOSE = false;
let DRY_RUN = false;

async function run() {
  const args = await parseArgs();
  if (args.help) {
    printUsage();
    Deno.exit(0);
  }
  if (args.version) {
    printVersion();
    Deno.exit(0);
  }
  if (args.verbose) {
    VERBOSE = true;
  }
  if (args.dry_run) {
    DRY_RUN = true;
  }
  if (args.files.length == 0) {
    printUsage();
    console.log(ink.colorize("\n<red>error:</red> No files specified"));
    Deno.exit(1);
  }

  const encoder = new TextEncoder();
  const ignoredFiles = await getIgnoredFiles();

  const skipLog: string[] = [];
  const dedup = args.files.filter((file) => {
    if (ignoredFiles.some((ignoredFile) => file === ignoredFile)) {
      if (args.verbose) {
        skipLog.push(file);
      }
      return false;
    }
    return true;
  });

  if (dedup.length == 0) {
    console.log(ink.colorize("\n<yellow>No files to add</yellow>"));
    Deno.exit(0);
  }

  log(
    formatLog(dedup, (file) =>
      `<green><b>Adding:</b></green> <magenta>${file}</magenta> to .gitignore`),
  );
  log(
    formatLog(skipLog, (file) =>
      `<yellow>Skipping:</yellow> <magenta>${file}</magenta> is already ignored`),
  );

  if (DRY_RUN) {
    Deno.exit(0);
  }

  await Deno.writeFile(".gitignore", encoder.encode(dedup.join("\n") + "\n"), {
    append: true,
  });

  console.log(
    ink.colorize(
      `<green><b>Done!</b></green> Added <green>${dedup.length}</green> new entries. Skipped <yellow>${skipLog.length}</yellow>.`,
    ),
  );
}

function log(msg: string) {
  if (VERBOSE || DRY_RUN) {
    console.log(msg);
  }
}

function formatLog(log: string[], format: (file: string) => string) {
  return log.map((file) =>
    ink.colorize(`    ${DRY_RUN ? "[dry-run] " : ""}${format(file)}`)
  ).join("\n");
}

run();
