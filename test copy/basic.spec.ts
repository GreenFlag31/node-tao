import { options, Tao } from '../src/index copy';
import path from 'path';
import { randomUUID } from 'crypto';
import { DEFAULT_EXTENSION } from '../src/const';
import { defaultConfig } from '../src/default-config';

describe('eta constructor', () => {
  it('initialisation', () => {
    const eta = new Tao();
    const currentConfig = eta['config'];
    expect(currentConfig).toStrictEqual(defaultConfig);
  });

  it('should merge config', () => {
    const currentConf = { cache: true, tags: { opening: '{{', closing: '}}' } };

    const tao = new Tao(currentConf);
    const conf = tao['config'];

    const finalConf: options = {
      ...defaultConfig,
      ...currentConf,
    };
    expect(conf).toMatchObject(finalConf);
  });

  it('should throw if opening and closing tags are equal', () => {
    const customConfig = { tags: { opening: '{{', closing: '{{' } };
    expect(() => new Tao(customConfig)).toThrow('Opening and closing tag should be different');
  });

  it('should throw if parse values are duplicated', () => {
    const customConfig: options = { parse: { exec: '<%', interpolate: '<%' } };
    expect(() => new Tao(customConfig)).toThrow(
      `Cannot have the same parse value at 'exec' and 'interpolate' with value '<%'`
    );
  });

  it('No template files should have been found', () => {
    const templateViews = path.join(process.cwd(), `unexisting-path-${randomUUID()}`);
    const tao = new Tao({ views: templateViews });

    expect(tao['templatePaths'].length).toBe(0);
  });

  it('Simple template files should be found', () => {
    const templateViews = path.join(process.cwd(), 'test copy/templates');
    const tao = new Tao({ views: templateViews });

    const pathWithSimpleSlash = path
      .join(templateViews, `simple.${DEFAULT_EXTENSION}`)
      .replace(/\\/g, '/');

    expect(tao['templatePaths']).toContain(pathWithSimpleSlash);
  });
});
