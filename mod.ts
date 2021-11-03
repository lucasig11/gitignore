//! Small command-line utility for adding new entries to `.gitignore`.
import { ink, Input, Toggle, wait } from "./deps.ts";
import { parseArgs, printUsage, printVersion } from "./args.ts";
import {
  addFileLogMessageFormat,
  deleteFile,
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
  switch (response.status) {
    case 200: {
      const data = await response.text();
      const lines = data.split("\n");
      return lines.filter((line) => line.trim().length > 0);
    }
    case 404: {
      throw new CliError(
        `no template found for <green>${lang}</green>`,
      );
    }
    default: {
      throw new CliError(
        `failed to fetch template for <green>${lang}</green>, check your connection and try again`,
      );
    }
  }
}

async function run(files: string[], opts: Options): Promise<void> {
  if (opts.overwrite) {
    await deleteFile(".gitignore", opts);
  }

  const { added, skipped, skipCount, addCount } = await parseEntries(files);

  log(added, addFileLogMessageFormat, opts);
  log(skipped, skipFileLogMessageFormat, opts);

  if (!opts.dryRun) {
    const content = added.map((entry) => entry.name);
    await Deno.writeFile(
      ".gitignore",
      new TextEncoder().encode(
        content.join("\n") + (content.length > 0 ? "\n" : ""),
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

  // Map strings to Entry objects
  const entries = rawEntries.map((entry) => ({
    name: entry,
    isComment: entry.startsWith("#"),
  }));

  const [skipped, added]: [Entry[], Entry[]] = entries.reduce(
    (acc, entry) => {
      if (ignoredEntries[entry.name]) {
        acc[0].push(entry);
      } else {
        acc[1].push(entry);
      }
      return acc;
    },
    [[], []] as [Entry[], Entry[]],
  );

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
    // Trim trailing new lines and map the entries to IgnoredFiles object
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
