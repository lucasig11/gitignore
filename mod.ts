//! Small command-line utility for adding new entries to `.gitignore`.
import { ink, Input, Toggle, wait } from "./deps.ts";
import { parseArgs, printUsage, printVersion } from "./args.ts";
import {
  addFileLogMessageFormat,
  log,
  skipFileLogMessageFormat,
} from "./util.ts";

import CliError from "./error.ts";

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
    throw new CliError(
      "cannot use both --overwrite and --dry-run at the same time",
    );
  }

  if (search && lang) {
    throw new CliError(
      "cannot use both --search and --lang at the same time",
    );
  }

  if (search || lang === "list") {
    lang = await listTemplates(confirm);
  }

  if (entries.length == 0 && !lang) {
    throw new CliError("no files specified");
  }

  if (lang) {
    const spinner = wait(
      ink.colorize(`Fetching a template for <green>${lang}</green>`),
    ).start();
    try {
      entries = entries.concat(await fetchTemplate(lang));
    } catch (e) {
      spinner.fail();
      throw e;
    }
    spinner.succeed();
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
      validate: (input: string) => {
        if (languages.includes(input)) {
          return true;
        }
        return "Invalid language";
      },
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
    throw new CliError(
      `failed to fetch a template for <yellow>${lang}</yellow>`,
    );
  }
  const data = await response.text();
  const lines = data.split("\n");
  return lines.filter((line) => line.trim().length > 0);
}

async function run(files: string[], opts: Options): Promise<void> {
  if (opts.overwrite) {
    try {
      await Deno.remove(".gitignore");
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        // ignore
      } else {
        throw new CliError(
          `failed to delete .gitignore`,
        );
      }
    }
  }

  const { added, skipped, skipCount, addCount } = await parseEntries(files);

  if (addCount == 0) {
    throw new CliError("no files to add", 0);
  }

  log(added, addFileLogMessageFormat, opts);
  log(skipped, skipFileLogMessageFormat, opts);

  if (!opts.dryRun) {
    await Deno.writeFile(
      ".gitignore",
      new TextEncoder().encode(
        added.map((entry) => "\n" + entry.name).join(""),
      ),
      { append: true },
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
    throw new CliError(
      `failed to read .gitignore`,
    );
  }
}

try {
  await main();
} catch (e) {
  if (e instanceof CliError) {
    console.error(ink.colorize("<red>error: </red>" + e.message));
    Deno.exit(e.exitCode);
  } else {
    console.error(
      ink.colorize(
        "<red>error:</red> an unexpected error occurred. Please file an issue at https://github.com/lucasig11/gitignore/issues",
      ),
      e.toString(),
    );
    Deno.exit(1);
  }
}
