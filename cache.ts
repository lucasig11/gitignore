import { getCacheDir } from "./util.ts";

const cacheFolder = "/gitignore/";
const cacheFile = "cache.json";
const cacheFullPath = getCacheDir() + cacheFolder + cacheFile;

interface ICacheProvider {
  set(key: string, value: string): Promise<void>;
  get(key: string): string;
  clear(): Promise<void>;
}

export default class Cache implements ICacheProvider {
  private cache: { [key: string]: string } = {};
  private enabled = true;

  constructor() {
    try {
      const contents = Deno.readFileSync(cacheFullPath);
      this.cache = JSON.parse(new TextDecoder().decode(contents));
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        if (getCacheDir() == null) {
          this.enabled = false;
        } else {
          Deno.mkdirSync(getCacheDir() + cacheFolder, { recursive: true });
          Deno.writeFileSync(
            cacheFullPath,
            new TextEncoder().encode("{}"),
          );
        }
      }
    }
  }

  public async set(key: string, value: string): Promise<void> {
    this.cache[key] = value;
    if (this.enabled) {
      await Deno.writeFile(
        cacheFullPath,
        new TextEncoder().encode(JSON.stringify(this.cache)),
      );
    }
  }

  public get(key: string): string {
    return this.cache[key];
  }

  public has(key: string): boolean {
    return this.cache[key] !== undefined;
  }

  public async clear(): Promise<void> {
    this.cache = {};
    if (this.enabled) {
      await Deno.writeFile(
        cacheFullPath,
        new TextEncoder().encode("{}"),
      );
    }
  }
}
