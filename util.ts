import { bold, green, magenta, yellow } from "./deps.ts";
import CliError from "./error.ts";
import { Arguments } from "./args.ts";

type Options = Pick<Arguments, "verbose" | "dryRun" | "overwrite">;
type IgnoredFiles = Record<string, boolean>;

const addFileLogMessageFormat = (file: string) =>
  `${green(bold("Adding:"))} ${magenta(file)} to .gitignore`;

const skipFileLogMessageFormat = (file: string) =>
  `${yellow(bold("Skipping:"))} ${magenta(file)} is already ignored`;

function logEntries(
  data: Entry[],
  format: (file: string) => string,
  options?: Options,
) {
  if (options?.verbose || options?.dryRun) {
    log(formatLogMsg(data, format, options.dryRun), options.verbose);
  }
}

function log(msg: string, verbose?: boolean) {
  if (verbose) {
    console.log(msg);
  }
}

function formatLogMsg(
  data: Entry[],
  format: (file: string) => string,
  dryRun?: boolean,
): string {
  return data.filter((entry) => !entry.isComment).map((entry) =>
    `${dryRun ? "[dry-run]" : ""}    ${format(entry.name)}`
  ).join("\n");
}

async function deleteFile(file: string) {
  try {
    await Deno.remove(file);
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      // ignore if it doesn't exist
    } else {
      throw new CliError(`failed to delete ${file}`, e);
    }
  }
}

function getCacheDir(): string | null {
  switch (Deno.build.os) {
    case "linux": {
      const xdg = Deno.env.get("XDG_CACHE_HOME");
      if (xdg) return xdg;

      const home = Deno.env.get("HOME");
      if (home) return `${home}/.cache`;
      break;
    }

    case "darwin": {
      const home = Deno.env.get("HOME");
      if (home) return `${home}/Library/Caches`;
      break;
    }

    case "windows":
      return Deno.env.get("FOLDERID_LocalAppData") ??
        Deno.env.get("LOCALAPPDATA") ?? null;
  }

  return null;
}

interface Entry {
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

/// Gets the list of files that are already ignored.
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
export {
  addFileLogMessageFormat,
  deleteFile,
  getCacheDir,
  getIgnoredEntries,
  log,
  logEntries,
  parseEntries,
  skipFileLogMessageFormat,
};
