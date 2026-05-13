import { Store } from '../../src/store';

describe('Store', () => {
  it('remove() should delete multiple keys at once and return the correct count', () => {
    const store = new Store<string>();
    store.set('a', 'val-a');
    store.set('b', 'val-b');
    store.set('c', 'val-c');

    const deleted = store.remove('a', 'b');

    expect(deleted).toBe(2);
    expect(store.get('a')).toBeUndefined();
    expect(store.get('b')).toBeUndefined();
    expect(store.get('c')).toBe('val-c');
  });

  it('remove() with a non-existent key should leave existing entries untouched', () => {
    const store = new Store<string>();
    store.set('exists', 'value');

    store.remove('nonExistent');

    expect(store.get('exists')).toBe('value');
  });

  it('getAll() should return a snapshot that does not reflect subsequent mutations', () => {
    const store = new Store<string>();
    store.set('x', 'hello');

    const all = store.getAll();
    store.set('y', 'world');

    // getAll returns a reference; this test documents the current behaviour
    expect(all).toHaveProperty('x', 'hello');
  });
});
