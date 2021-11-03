import { bold, green, magenta, yellow } from "./deps.ts";
import CliError from "./error.ts";
import { Entry, Options } from "./mod.ts";

const addFileLogMessageFormat = (file: string) =>
  `${green(bold("Adding:"))} ${magenta(file)} to .gitignore`;

const skipFileLogMessageFormat = (file: string) =>
  `${yellow(bold("Skipping:"))} ${magenta(file)} is already ignored`;

function log(
  data: Entry[],
  format: (file: string) => string,
  options?: Options,
) {
  if (options?.verbose || options?.dryRun) {
    console.log(formatLogMsg(data, format, options));
  }
}

function formatLogMsg(
  data: Entry[],
  format: (file: string) => string,
  options?: Options,
): string {
  return data.filter((entry) => !entry.isComment).map((entry) =>
    `${options?.dryRun ? "[dry-run]" : ""}    ${format(entry.name)}`
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

export {
  addFileLogMessageFormat,
  deleteFile,
  getCacheDir,
  log,
  skipFileLogMessageFormat,
};
