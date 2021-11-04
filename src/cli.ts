import {
  bold,
  green,
  Input,
  red,
  TerminalSpinner,
  Toggle,
  yellow,
} from "./deps.ts";
import {
  addFileLogMessageFormat,
  deleteFile,
  log,
  logEntries,
  parseEntries,
  skipFileLogMessageFormat,
} from "./util.ts";
import CliError from "./error.ts";
import Cache from "./cache.ts";
import { Arguments } from "./args.ts";

export default class Cli {
  private cache: Cache;
  private args: Arguments;

  constructor(args: Arguments) {
    this.args = args;
    this.cache = new Cache();
  }

  public async run(): Promise<void> {
    let {
      clearCache,
      entries,
      lang,
      search,
    } = this.args;

    if (clearCache) {
      await this.clearCache();
    }

    if (search || lang === "list") {
      lang = await this.listTemplates();
    }

    if (lang) {
      const spinner = new TerminalSpinner(
        `Fetching a template for ${green(lang)}`,
      ).start();
      try {
        const template = await this.fetchTemplate(lang);
        entries = entries.concat(template);
      } catch (e) {
        spinner.fail();
        throw e;
      }
      spinner.succeed();
    }

    await this.addIgnoredEntries(entries);
  }

  private async clearCache() {
    log(yellow("Clearing cache..."), true);
    await this.cache.clear();
    if (!this.args.search && !this.args.lang && this.args.entries.length <= 0) {
      log(yellow("Cache cleared. No entries to add."), true);
      Deno.exit(0);
    }
  }

  private async addIgnoredEntries(files: string[]): Promise<void> {
    if (this.args.overwrite) {
      await deleteFile(".gitignore");
    }

    const { added, skipped, skipCount, addCount } = await parseEntries(files);

    logEntries(added, addFileLogMessageFormat, this.args);
    logEntries(skipped, skipFileLogMessageFormat, this.args);

    if (!this.args.dryRun) {
      const content = added.map((entry) => entry.name);
      await Deno.writeFile(
        ".gitignore",
        new TextEncoder().encode(
          content.join("\n") + (content.length > 0 ? "\n" : ""),
        ),
        { append: true },
      );
    }

    log(
      `${green(bold("Done!"))} Added ${
        green(addCount.toString())
      } new entries. Skipped ${yellow(skipCount.toString())}.`,
      true,
    );
  }

  private async listTemplates(): Promise<string> {
    const templates: string[] = await this.fetchTemplate("list");
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

    const confirm: boolean = this.args.confirm || await Toggle.prompt(
      `Would you like to use the ${green(selected)} template?`,
    );

    if (!confirm) {
      Deno.exit(0);
    }

    return selected;
  }

  // TODO: refactor into API agnostic template provider
  private async fetchTemplate(lang: string): Promise<string[]> {
    if (this.cache.has(lang)) {
      return this.cache.get(lang).split("\n").filter((line) =>
        line.trim().length > 0
      );
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
          await this.cache.set(lang, template.join("\n"));
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
}
