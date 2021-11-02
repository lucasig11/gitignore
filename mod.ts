//! Small command-line utility for adding new entries to `.gitignore`.
/// deno install --allow-read --allow-write mod.ts
import * as ink from "https://deno.land/x/ink@1.3/mod.ts";
import { wait } from "https://deno.land/x/wait@0.1.12/mod.ts";

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
    lang,
    entries,
  } = await parseArgs();

  if (help) {
    printUsage();
    Deno.exit(0);
  }
  if (version) {
    printVersion();
    Deno.exit(0);
  }

  if (overwrite && dryRun) {
    console.error(
      "Cannot use both --overwrite and --dry-run at the same time",
    );
    Deno.exit(1);
  }

  if (entries.length == 0 && !lang) {
    printUsage();
    console.log(ink.colorize("\n<red><b>error:</b></red> No files specified"));
    Deno.exit(1);
  }

  let files = entries;
  if (lang) {
    const response = await fetchLanguages(lang);
    files = files.concat(response);
  }

  const [addCount, skipCount] = await run(files, {
    verbose,
    dryRun,
    overwrite,
  });

  console.log(
    ink.colorize(
      `<green><b>Done!</b></green> Added <green>${addCount}</green> new entries. Skipped <yellow>${skipCount}</yellow>.`,
    ),
  );
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

async function fetchLanguages(lang: string): Promise<string[]> {
  const spinner = wait(
    ink.colorize(`Fetching a template for <green>${lang}</green>`),
  )
    .start();
  try {
    const response = await fetch(`https://www.gitignore.io/api/${lang}`);
    if (response.status != 200) {
      spinner.fail();
      console.error(
        ink.colorize(
          `<red>error:</red> failed to fetch a template for <yellow>${lang}</yellow>`,
        ),
      );
      Deno.exit(1);
    }
    const data = await response.text();
    const lines = data.split("\n");
    return lines.filter((line) => line.trim().length > 0);
  } catch (error) {
    spinner.fail();
    console.error("Unexpected error:", error);
    Deno.exit(1);
  } finally {
    spinner.succeed();
  }
  return [];
}

async function run(files: string[], opts: Options): Promise<[number, number]> {
  // Delete the old file if we are overwriting
  if (opts.overwrite) {
    try {
      await Deno.remove(".gitignore");
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        // ignore
      } else {
        console.error("unexpected error:", e);
        Deno.exit(1);
      }
    }
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

  return [addCount, skipCount];
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
