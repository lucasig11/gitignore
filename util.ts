import * as ink from "https://deno.land/x/ink@1.3/mod.ts";
import { Options } from "./mod.ts";

function log(
  data: string[],
  format: (file: string) => string,
  options?: Options,
) {
  if (options?.verbose || options?.dryRun) {
    console.log(formatLogMsg(data, format, options));
  }
}

function formatLogMsg(
  data: string[],
  format: (file: string) => string,
  options?: Options,
): string {
  return options?.verbose || options?.dryRun
    ? data.map((file) =>
      ink.colorize(`${options?.dryRun ? "[dry-run]" : ""}    ${format(file)}`)
    ).join("\n")
    : "";
}

export { log };
