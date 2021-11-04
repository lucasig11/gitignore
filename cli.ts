import {
  bold,
  green,
  Inject,
  Injectable,
  TerminalSpinner,
  yellow,
} from "./deps.ts";
import {
  addFileLogMessageFormat,
  log,
  logEntries,
  parseEntries,
  skipFileLogMessageFormat,
} from "./shared/util.ts";
import { Arguments } from "./shared/args.ts";
import ICacheProvider from "./shared/container/providers/CacheProvider/models/ICacheProvider.ts";
import ITemplateProvider from "./shared/container/providers/TemplateProvider/models/ITemplateProvider.ts";

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
      Deno.exit(0);
    }
  }

  private async addIgnoredEntries(files: string[]): Promise<void> {
    const { added, skipped, skipCount, addCount } = await parseEntries(
      files,
      this.args.overwrite,
    );

    logEntries(added, addFileLogMessageFormat, this.args);
    logEntries(skipped, skipFileLogMessageFormat, this.args);

    if (!this.args.dryRun) {
      const content = added.map((entry) => entry.name);
      await Deno.writeFile(
        ".gitignore",
        new TextEncoder().encode(
          content.join("\n") + (content.length > 0 ? "\n" : ""),
        ),
        { append: !this.args.overwrite },
      );
    }

    log(
      `${green(bold("Done!"))} Added ${
        green(addCount.toString())
      } new entries. Skipped ${yellow(skipCount.toString())}.`,
      true,
    );
  }
}
