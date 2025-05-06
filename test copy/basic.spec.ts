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

  it('should freeze', () => {
    expect(Object.isFrozen(eta.currentConfig)).toBe(true);
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

  it('should initialize templatePaths with correct files', () => {
    const instance = new Eta({ views: path.join(process.cwd(), 'test copy') });
    const fileEnd = `\\test copy\\templates\\simple${instance.currentConfig.extension}`;
    let fileIsFound = false;

    fileIsFound = instance.mappedFiles.some((file) => file.endsWith(fileEnd));

    if (!fileIsFound) throw new Error('File not found');
  });

  it('should throw an error because no template files have been found', () => {
    const dir = path.join(process.cwd(), `unexisting-path-${randomUUID()}`);
    const ext = DEFAULT_EXTENSION;

    expect(
      () =>
        new Eta({
          views: dir,
        })
    ).toThrow(`No template files found in ${dir} with extension ${ext}`);
  });
});
