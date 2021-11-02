//! Small command-line utility for adding new entries to `.gitignore`.
/// deno install --allow-read --allow-write mod.ts
import * as ink from "https://deno.land/x/ink@1.3/mod.ts";
import { wait } from "https://deno.land/x/wait@0.1.12/mod.ts";
import { Input } from "https://deno.land/x/cliffy@v0.20.1/prompt/input.ts";
import { Toggle } from "https://deno.land/x/cliffy@v0.20.1/prompt/toggle.ts";

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

async function main(): Promise<void> {
  let {
    verbose,
    overwrite,
    dryRun,
    help,
    version,
    confirm,
    lang,
    search,
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

  if (search) {
    lang = await listTemplates(confirm);
  }

  if (entries.length == 0 && !lang) {
    printUsage();
    console.log(ink.colorize("\n<red><b>error:</b></red> No files specified"));
    Deno.exit(1);
  }

  if (lang) {
    const spinner = wait(
      ink.colorize(`Fetching a template for <green>${lang}</green>`),
    ).start();
    try {
      entries = entries.concat(await fetchTemplate(lang));
    } catch (error) {
      spinner.fail();
      console.error(ink.colorize(error));
      Deno.exit(1);
    } finally {
      spinner.succeed();
    }
  }

  await run(entries, {
    verbose,
    dryRun,
    overwrite,
  });
}

async function listTemplates(skipConfirm: boolean): Promise<string> {
  const templates: string[] = await fetchTemplate("list");
  const languages: string[] = templates.flatMap((line) => line.split(","));

  const selected = await Input.prompt(
    {
      message: "Select a language:",
      suggestions: languages,
      list: true,
      info: true,
    },
  );

  const confirm: boolean = skipConfirm || await Toggle.prompt(
    ink.colorize(
      `Would you like to use the <green>${selected}</green> template?`,
    ),
  );

  if (!confirm) {
    Deno.exit(0);
  }

  return selected;
}

async function fetchTemplate(lang: string): Promise<string[]> {
  const response = await fetch(`https://www.gitignore.io/api/${lang}`);
  if (response.status != 200) {
    throw new Error(
      `<red>error:</red> failed to fetch a template for <yellow>${lang}</yellow>`,
    );
  }
  const data = await response.text();
  const lines = data.split("\n");
  return lines.filter((line) => line.trim().length > 0);
}

async function run(files: string[], opts: Options): Promise<void> {
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
