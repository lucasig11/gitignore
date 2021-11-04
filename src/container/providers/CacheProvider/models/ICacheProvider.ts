export default interface ICacheProvider {
  set(key: string, value: string): Promise<void>;
  get(key: string): string;
  has(key: string): boolean;
  clear(): Promise<void>;
}
