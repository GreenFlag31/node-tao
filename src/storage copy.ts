import { TemplateFunction } from './interfaces';

export class Store<T = TemplateFunction> {
  private store: Record<string, T> = {};

  define(key: string, fn: T) {
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

  load(cached: Record<string, T>) {
    this.store = { ...this.store, ...cached };
  }
}
