import { writeAllSync } from "../deps.ts";
import CliError from "./error.ts";

interface Options {
  verbose: boolean;
  dryRun: boolean;
  overwrite: boolean;
}

interface Data {
  name: string;
  isComment: boolean;
}

class Writer {
  public static writeAllSync(writer: Deno.WriterSync, message: string): void {
    const encoder = new TextEncoder();
    writeAllSync(writer, encoder.encode(message));
  }

  public static writeTextFileSync(
    filename: string,
    content: string,
    options?: { append: boolean },
  ) {
    const writer = Deno.openSync(filename, {
      write: true,
      append: options?.append,
      create: true,
    });
    Writer.writeAllSync(writer, content);
    writer.close();
  }
}

function logEntries(
  data: Data[],
  format: (file: string) => string,
  options?: Options,
) {
  if (options?.verbose || options?.dryRun) {
    const formatted = formatLogMsg(data, format, options?.dryRun);
    log(formatted, true);
  }
}

function formatLogMsg(
  data: Data[],
  format: (file: string) => string,
  dryRun?: boolean,
): string {
  return data.filter((entry) => !entry.isComment).map((entry) =>
    `${dryRun ? "[dry-run]" : ""}    ${format(entry.name)}`
  ).join("\n");
}

function log(msg: string, verbose?: boolean) {
  if (verbose) {
    Writer.writeAllSync(Deno.stdout, msg + "\n");
  }
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

export { deleteFile, getCacheDir, log, logEntries, Writer };
