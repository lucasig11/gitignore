import ICacheProvider from "../../CacheProvider/models/ICacheProvider.ts";
import ITemplateProvider from "../models/ITemplateProvider.ts";

export default class FakeTemplateProvider implements ITemplateProvider {
  constructor(private fakeCacheProvider: ICacheProvider) {}

  fetchTemplate(templateName: string): Promise<string[]> {
    if (this.fakeCacheProvider.has(templateName)) {
      return Promise.resolve(
        this.fakeCacheProvider.get(templateName).split("\n"),
      );
    }

    const fakeEntries = [
      "*.out",
      "node_modules/",
      "*.o",
      "tmp/",
      "!tmp/.gitkeep",
    ];

    this.fakeCacheProvider.set(templateName, fakeEntries.join("\n"));

    return Promise.resolve(fakeEntries);
  }

  listTemplates(): Promise<string> {
    return Promise.resolve("fakeTemplate");
  }
}
