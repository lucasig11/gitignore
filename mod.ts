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

export interface Entry {
  name: string;
  isComment: boolean;
}

interface Entries {
  added: Entry[];
  skipped: Entry[];
  addCount: number;
  skipCount: number;
}

async function parseEntries(rawEntries: string[]): Promise<Entries> {
  const ignoredEntries = await getIgnoredEntries();

  const skipped: Entry[] = rawEntries.filter((entry) => ignoredEntries[entry])
    .map((entry) => ({
      name: entry,
      isComment: entry.startsWith("#"),
    }));

  const added: Entry[] = rawEntries.filter((entry) => !ignoredEntries[entry])
    .map((entry) => ({
      name: entry,
      isComment: entry.startsWith("#"),
    }));

  return {
    added,
    skipped,
    addCount: added.filter((entry) => !entry.isComment).length,
    skipCount: skipped.filter((entry) => !entry.isComment).length,
  };
}

async function run(files: string[], opts: Options) {
  // Delete the old file if we are overwriting
  if (opts.overwrite) {
    await Deno.remove(".gitignore");
  }

  const { added, skipped, skipCount, addCount } = await parseEntries(files);

  if (addCount == 0) {
    console.log(ink.colorize("\n<yellow>No files to add</yellow>\n"));
    Deno.exit(0);
  }

  log(added, addFileLogMessageFormat, opts);
  log(skipped, skipFileLogMessageFormat, opts);

  if (!opts.dryRun) {
    await Deno.writeFile(
      ".gitignore",
      new TextEncoder().encode(
        added.map((entry) => entry.name).join("\n") + "\n",
      ),
    );
  }

  console.log(
    ink.colorize(
      `<green><b>Done!</b></green> Added <green>${addCount}</green> new entries. Skipped <yellow>${skipCount}</yellow>.`,
    ),
  );
}

// Get the list of files that are already ignored
async function getIgnoredEntries(): Promise<IgnoredFiles> {
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
