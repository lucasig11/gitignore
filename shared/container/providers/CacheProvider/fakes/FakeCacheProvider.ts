import ICacheProvider from "../models/ICacheProvider.ts";

export default class FakeCacheProvider implements ICacheProvider {
  private cache: Record<string, string> = {};

  set(key: string, value: string): Promise<void> {
    this.cache[key] = value;
    return Promise.resolve();
  }

  get(key: string): string {
    return this.cache[key];
  }
  has(key: string): boolean {
    return !!this.cache[key];
  }
  clear(): Promise<void> {
    this.cache = {};
    return Promise.resolve();
  }
}
