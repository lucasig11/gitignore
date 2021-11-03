import { cache_dir as cacheDir } from "./deps.ts";

const cacheFolder = "/gitignore/";
const cacheFile = "cache.json";
const cacheFullPath = cacheDir() + cacheFolder + cacheFile;

interface ICacheProvider {
  set(key: string, value: string): Promise<void>;
  get(key: string): string;
  clear(): Promise<void>;
}

export default class Cache implements ICacheProvider {
  private cache: { [key: string]: string } = {};
  constructor() {
    try {
      const contents = Deno.readFileSync(cacheFullPath);
      this.cache = JSON.parse(new TextDecoder().decode(contents));
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        Deno.mkdirSync(cacheDir() + cacheFolder, { recursive: true });
        Deno.writeFileSync(
          cacheFullPath,
          new TextEncoder().encode("{}"),
        );
      }
    }
  }

  public async set(key: string, value: string): Promise<void> {
    this.cache[key] = value;
    await Deno.writeFile(
      cacheFullPath,
      new TextEncoder().encode(JSON.stringify(this.cache)),
    );
  }

  public get(key: string): string {
    return this.cache[key];
  }

  public has(key: string): boolean {
    return this.cache[key] !== undefined;
  }

  public async clear(): Promise<void> {
    this.cache = {};
    await Deno.writeFile(
      cacheFullPath,
      new TextEncoder().encode("{}"),
    );
  }
}
