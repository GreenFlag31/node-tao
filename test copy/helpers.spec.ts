import path from 'node:path';
import { getFullPath, getPathWithExtension } from '../src/checks';
import { log } from 'node:console';

describe('checks function tests', () => {
  it('getPathWithExtension should return a path with its extension when the filePath does not contain the extension', () => {
    const result = getPathWithExtension('simple', 'eta');
    expect(result).toBe('simple.eta');
  });

  it('getPathWithExtension should return a path with its extension when the filePath contains the extension', () => {
    const result = getPathWithExtension('simple.eta', 'eta');
    expect(result).toBe('simple.eta');
  });

  it('getFullPath should return a complete path when the given template is not absolute', () => {
    const views = path.join(process.cwd(), 'test copy/templates');
    const template = 'simple.eta';
    const pathIsAbsolute = path.isAbsolute(template);

    const result = getFullPath(views, template, pathIsAbsolute);
    expect(result).toBe(path.join(views, template));
  });

  it('getFullPath should return a complete path when the given template is absolute', () => {
    const views = path.join(process.cwd(), 'test copy/templates');
    const template = 'simple.eta';

    const completePath = path.join(views, template);
    const pathIsAbsolute = path.isAbsolute(completePath);

    const result = getFullPath(views, completePath, pathIsAbsolute);
    expect(result).toBe(completePath);
  });
});
