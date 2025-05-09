import { TemplateFunction } from './interfaces';

export class Store {
  private store: Record<string, TemplateFunction> = {};

  define(key: string, fn: TemplateFunction) {
    this.store[key] = fn;
  }

  get(key: string) {
    return this.store[key];
  }

  remove(key: string) {
    delete this.store[key];
  }

  reset() {
    this.store = {};
  }

  load(cached: Record<string, TemplateFunction>) {
    this.store = { ...this.store, ...cached };
  }
}
