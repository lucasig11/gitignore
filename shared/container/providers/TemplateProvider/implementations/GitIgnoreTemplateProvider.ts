import { green, Inject, Injectable, Input, red } from "../../../../../deps.ts";
import CliError from "../../../../error.ts";
import ITemplateProvider from "../models/ITemplateProvider.ts";
import ICacheProvider from "../../CacheProvider/models/ICacheProvider.ts";

@Injectable()
export default class GitIgnoreTemplateProvider implements ITemplateProvider {
  constructor(
    @Inject("CacheProvider") private cacheProvider: ICacheProvider,
  ) {}

  async listTemplates(): Promise<string> {
    const templates: string[] = await this.fetchTemplate("list");
    const languages: string[] = templates.flatMap((line) => line.split(","));

    return Input.prompt(
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
  }

  async fetchTemplate(lang: string): Promise<string[]> {
    if (this.cacheProvider.has(lang)) {
      return this.cacheProvider.get(lang).split("\n").filter((line) =>
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
          await this.cacheProvider.set(lang, template.join("\n"));
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
