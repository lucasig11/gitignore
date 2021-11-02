import { ink } from "./deps.ts";
import { Entry, Options } from "./mod.ts";

const addFileLogMessageFormat = (file: string) =>
  `<green><b>Adding:</b></green> <magenta>${file}</magenta> to .gitignore`;

const skipFileLogMessageFormat = (file: string) =>
  `<yellow>Skipping:</yellow> <magenta>${file}</magenta> is already ignored`;

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
    ink.colorize(
      `${options?.dryRun ? "[dry-run]" : ""}    ${format(entry.name)}`,
    )
  ).join("\n");
}

export { addFileLogMessageFormat, log, skipFileLogMessageFormat };
