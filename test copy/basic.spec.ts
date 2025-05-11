import { defaultConfig } from '../src/config copy';
import { Eta, EtaConfig } from '../src/index copy';
import path from 'path';
import { randomUUID } from 'crypto';
import { DEFAULT_EXTENSION } from '../src/const';

const eta = new Eta();

describe('eta constructor', () => {
  it('initialisation', () => {
    expect(eta.currentConfig).toStrictEqual(defaultConfig);
  });

  it('should merge config', () => {
    const currentConf = { cache: true, tags: { opening: '{{', closing: '}}' } };
    const eta = new Eta(currentConf);

    const finalConf: EtaConfig = {
      ...defaultConfig,
      ...currentConf,
    };
    expect(eta.currentConfig).toMatchObject(finalConf);
  });

  it('should throw if opening and closing tags are equal', () => {
    const customConfig = { tags: { opening: '{{', closing: '{{' } };
    expect(() => new Eta(customConfig)).toThrow('Opening and closing tag should be different');
  });

  it('should throw if parse values are duplicated', () => {
    const customConfig: EtaConfig = { parse: { exec: '<%', interpolate: '<%' } };
    expect(() => new Eta(customConfig)).toThrow(
      `Cannot have the same parse value at 'exec' and 'interpolate' with value '<%'`
    );
  });

  it('No template files should have been found', () => {
    const templateViews = path.join(process.cwd(), `unexisting-path-${randomUUID()}`);
    const eta = new Eta({ views: templateViews });

    expect(eta['templatePaths'].length).toBe(0);
  });

  it('Simple template files should be found', () => {
    const templateViews = path.join(process.cwd(), 'test copy/templates');
    const eta = new Eta({ views: templateViews });

    expect(eta['templatePaths']).toContain(path.join(templateViews, `simple.${DEFAULT_EXTENSION}`));
  });
});
