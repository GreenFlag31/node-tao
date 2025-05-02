import { TemplateFunction } from "./interfaces";

export class Cacher {
  private cache: Record<string, TemplateFunction> = {};

  define(key: string, val: TemplateFunction) {
    this.cache[key] = val;
  }
  get(key: string) {
    return this.cache[key];
  }
  remove(key: string) {
    delete this.cache[key];
  }
  reset() {
    this.cache = {};
  }
  load(cached: Record<string, TemplateFunction>) {
    this.cache = { ...this.cache, ...cached };
  }
}
