import {
  bold,
  green,
  Inject,
  Injectable,
  magenta,
  TerminalSpinner,
  yellow,
} from "./deps.ts";
import { log, logEntries, Writer } from "./shared/util.ts";
import { Arguments } from "./shared/args.ts";
import ICacheProvider from "./shared/container/providers/CacheProvider/models/ICacheProvider.ts";
import ITemplateProvider from "./shared/container/providers/TemplateProvider/models/ITemplateProvider.ts";
import CliError from "./shared/error.ts";

type IgnoredFiles = Record<string, boolean>;

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

const addFileLogMessageFormat = (file: string) =>
  `${green(bold("Adding:"))} ${magenta(file)} to .gitignore`;

const skipFileLogMessageFormat = (file: string) =>
  `${yellow(bold("Skipping:"))} ${magenta(file)} is already ignored`;

@Injectable()
export default class GitIgnoreCli {
  private args: Arguments = {} as Arguments;

  constructor(
    @Inject("CacheProvider") private cacheProvider: ICacheProvider,
    @Inject("TemplateProvider") private templateProvider: ITemplateProvider,
  ) {}

  public async run(args: Arguments): Promise<void> {
    let {
      clearCache,
      entries,
      lang,
      search,
    } = this.args = args;

    if (clearCache) {
      await this.clearCache();
    }

    if (search || lang === "list") {
      lang = await this.templateProvider.listTemplates();
    }

    if (lang) {
      const spinner = new TerminalSpinner(
        `Fetching a template for ${green(lang)}`,
      ).start();
      try {
        const template = await this.templateProvider.fetchTemplate(lang);
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
    await this.cacheProvider.clear();
    if (!this.args.search && !this.args.lang && this.args.entries.length <= 0) {
      log(yellow("Cache cleared. No entries to add."), true);
      return;
    }
  }

  private async addIgnoredEntries(files: string[]): Promise<void> {
    const { added, skipped, skipCount, addCount } = await this.parseEntries(
      files,
    );

    logEntries(added, addFileLogMessageFormat, this.args);
    logEntries(skipped, skipFileLogMessageFormat, this.args);

    if (!this.args.dryRun) {
      const content = added.map((entry) => entry.name);
      Writer.writeTextFileSync(
        ".gitignore",
        content.join("\n") + (content.length > 0 ? "\n" : ""),
        { append: !this.args.overwrite },
      );
    }

    log(
      `\n${green(bold("Done!"))} Added ${
        green(addCount.toString())
      } new entries. Skipped ${yellow(skipCount.toString())}.`,
      true,
    );
  }
  async parseEntries(
    rawEntries: string[],
  ): Promise<Entries> {
    const ignoredEntries = this.args.overwrite
      ? {}
      : await this.getIgnoredEntries();

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
  async getIgnoredEntries(): Promise<IgnoredFiles> {
    try {
      const content = await Deno.readTextFile(".gitignore");
      const lines = content.split("\n");
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
        `failed to read .gitignore:\n${e}`,
      );
    }
  }
}
