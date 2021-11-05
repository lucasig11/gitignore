import ICacheProvider from "../models/ICacheProvider.ts";
import { getCacheDir, Writer } from "../../../../util.ts";

const cacheFolder = "/gitignore/";
const cacheFile = "cache.json";
const cacheFullPath = getCacheDir() + cacheFolder + cacheFile;

export default class JsonCacheProvider implements ICacheProvider {
  private cache: { [key: string]: string } = {};
  private enabled = true;

  constructor() {
    try {
      const content = Deno.readTextFileSync(cacheFullPath);
      this.cache = JSON.parse(content);
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        if (getCacheDir() == null) {
          this.enabled = false;
        } else {
          Deno.mkdirSync(getCacheDir() + cacheFolder, { recursive: true });
          Writer.writeTextFileSync(cacheFullPath, "{}");
        }
      }
    }
  }

  public async set(key: string, value: string): Promise<void> {
    this.cache[key] = value;
    if (this.enabled) {
      await Deno.writeTextFile(cacheFullPath, JSON.stringify(this.cache));
    }
  }

  public get(key: string): string {
    return this.cache[key];
  }

  public has(key: string): boolean {
    return this.cache[key] !== undefined;
  }

  public clear(): Promise<void> {
    this.cache = {};
    if (this.enabled) {
      Writer.writeTextFileSync(cacheFullPath, "{}");
    }
    return Promise.resolve();
  }
}
