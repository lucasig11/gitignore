//! Small command-line utility for adding new entries to `.gitignore`.
import {
  bold,
  green,
  Input,
  red,
  TerminalSpinner,
  Toggle,
  yellow,
} from "./deps.ts";
import { Arguments, parseArgs } from "./args.ts";
import {
  addFileLogMessageFormat,
  deleteFile,
  log,
  skipFileLogMessageFormat,
} from "./util.ts";

import CliError from "./error.ts";
import Cache from "./cache.ts";

export type Options = Pick<Arguments, "verbose" | "dryRun" | "overwrite">;
type IgnoredFiles = Record<string, boolean>;

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

async function main(): Promise<void> {
  let {
    clearCache,
    confirm,
    dryRun,
    entries,
    lang,
    overwrite,
    search,
    verbose,
  } = await parseArgs();
  const cache = new Cache();

  if (clearCache) {
    console.log(yellow("Clearing cache..."));
    await cache.clear();
    if (!search && !lang && entries.length <= 0) {
      console.log(yellow("Cache cleared. No entries to add."));
      Deno.exit(0);
    }
  }

  if (search || lang === "list") {
    lang = await listTemplates(confirm, cache);
  }

  if (lang) {
    const spinner = new TerminalSpinner(
      `Fetching a template for ${green(lang)}`,
    ).start();
    try {
      const template = await fetchTemplate(lang, cache);
      entries = entries.concat(template);
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

async function listTemplates(
  skipConfirm: boolean,
  cache: Cache,
): Promise<string> {
  const templates: string[] = await fetchTemplate("list", cache);
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
    `Would you like to use the ${green(selected)} template?`,
  );

  if (!confirm) {
    Deno.exit(0);
  }

  return selected;
}

async function fetchTemplate(lang: string, cache: Cache): Promise<string[]> {
  if (cache.has(lang)) {
    return cache.get(lang).split("\n").filter((line) => line.trim().length > 0);
  }

  try {
    const response = await fetch(`https://www.gitignore.io/api/${lang}`);
    switch (response.status) {
      case 200: {
        const data = await response.text();
        const template = data.split("\n").filter((line) =>
          line.trim().length > 0
        )
          .slice(2, -1);
        await cache.set(lang, template.join("\n"));
        return template;
      }
      case 404: {
        throw new CliError(
          `no template found for ${green(lang)}`,
        );
      }
      default: {
        throw new CliError(
          `failed to fetch template for ${green(lang)}, the API returned ${
            red(response.status.toString())
          }`,
        );
      }
    }
  } catch (_) {
    throw new CliError(
      `failed to fetch template for ${
        green(lang)
      }, check your connection and try again`,
    );
  }
}

async function run(files: string[], opts: Options): Promise<void> {
  if (opts.overwrite) {
    await deleteFile(".gitignore");
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
    `${green(bold("Done!"))} Added ${
      green(addCount.toString())
    } new entries. Skipped ${yellow(skipCount.toString())}.`,
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
    console.error(`${red("error:")} ` + e.message);
    Deno.exit(e.exitCode);
  } else {
    console.trace(
      `${
        red("error:")
      } an unexpected error occurred. Please file an issue at https://github.com/lucasig11/gitignore/issues \n`,
      e.toString(),
    );
    Deno.exit(1);
  }
}
