//! Small command-line utility for adding new entries to `.gitignore`.
/// deno install --allow-read --allow-write mod.ts
import * as ink from "https://deno.land/x/ink@1.3/mod.ts";

import { parseArgs, printUsage, printVersion } from "./args.ts";
import {
  addFileLogMessageFormat,
  log,
  skipFileLogMessageFormat,
} from "./util.ts";

export interface Options {
  verbose: boolean;
  dryRun: boolean;
  overwrite: boolean;
}

interface IgnoredFiles {
  [key: string]: boolean;
}

async function main() {
  const {
    verbose,
    overwrite,
    dryRun,
    help,
    version,
    files,
  } = await parseArgs();

  if (help) {
    printUsage();
    Deno.exit(0);
  }
  if (version) {
    printVersion();
    Deno.exit(0);
  }
  if (files.length == 0) {
    printUsage();
    console.log(ink.colorize("\n<red><b>error:</b></red> No files specified"));
    Deno.exit(1);
  }
  await run(files, {
    verbose,
    dryRun,
    overwrite,
  });
}

async function run(files: string[], opts: Options) {
  const skipped: string[] = [];

  const encoder = new TextEncoder();
  const ignoredFiles = await getIgnoredFiles();

  const added = files.filter((file) => {
    if (ignoredFiles[file]) {
      if (opts.verbose) {
        skipped.push(file);
      }
      return false;
    }
    return true;
  });

  if (added.length == 0) {
    console.log(ink.colorize("\n<yellow>No files to add</yellow>"));
    Deno.exit(0);
  }

  log(
    added,
    addFileLogMessageFormat,
    opts,
  );

  log(
    skipped,
    skipFileLogMessageFormat,
    opts,
  );

  if (!opts.dryRun) {
    await Deno.writeFile(
      ".gitignore",
      encoder.encode(added.join("\n") + "\n"),
      {
        append: !opts.overwrite,
      },
    );
  }

  console.log(
    ink.colorize(
      `<green><b>Done!</b></green> Added <green>${added.length}</green> new entries. Skipped <yellow>${skipped.length}</yellow>.`,
    ),
  );
}

// Get the list of files that are already ignored
async function getIgnoredFiles(): Promise<IgnoredFiles> {
  try {
    const content = await Deno.readFile(".gitignore");
    const lines = new TextDecoder().decode(content).split("\n");
    return lines.reduce((acc, line) => {
      if (line.trim().length > 0) {
        acc[line] = true;
      }
      return acc;
    }, {} as IgnoredFiles);
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return {} as IgnoredFiles;
    }
    console.error("unexpected error:", e);
    Deno.exit(1);
  }
}

main();
