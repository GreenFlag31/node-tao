import { TemplateFunction } from './interfaces';

export class Store<T = TemplateFunction> {
  private store: Record<string, T> = {};

  define(key: string, value: T) {
    this.store[key] = value;
  }

  get(key: string) {
    return this.store[key];
  }

  getAll() {
    return this.store;
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
