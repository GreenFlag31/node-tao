import path from 'node:path';
import { getPathWithExtension, isTemplateFileInsideGivenDirectory } from '../src/checks';
import { getFullPath } from '../src/utils';

describe('checks function tests', () => {
  it('getPathWithExtension should return a path with its extension when the filePath does not contain the extension', () => {
    const result = getPathWithExtension('simple', 'eta');
    expect(result).toBe('simple.eta');
  });

  it('getPathWithExtension should return a path with its extension when the filePath contains the extension', () => {
    const result = getPathWithExtension('simple.eta', 'eta');
    expect(result).toBe('simple.eta');
  });

  it('getFullPath should return a complete path when the path is not absolute', () => {
    const views = path.join(process.cwd(), 'test copy/templates');
    const template = 'simple.eta';

    const result = getFullPath(views, template, 'strict');
    expect(result).toBe(path.join(views, template));
  });

  it('getFullPath should return a complete path when the path is absolute', () => {
    const views = path.join(process.cwd(), 'test copy/templates');
    const template = 'simple.eta';
    const completePath = path.join(views, template);

    const result = getFullPath(views, completePath, 'strict');
    expect(result).toBe(completePath);
  });

  it('isTemplateFileInsideGivenDirectory should contains templatePath', () => {
    const templatePaths = ['D:\\Manu\\Desktop\\Code\\eta-lib\\test copy\\simple.eta'];
    const templateFile = 'simple.eta';
    const result = isTemplateFileInsideGivenDirectory(templatePaths, templateFile);
    expect(result).toMatchObject(templatePaths);
  });

  it('isTemplateFileInsideGivenDirectory should be empty', () => {
    const templatePaths = ['D:\\Manu\\Desktop\\Code\\eta-lib\\test copy\\simple.eta'];
    const templateFile = 'unexistant.eta';
    const result = isTemplateFileInsideGivenDirectory(templatePaths, templateFile);
    expect(result).toMatchObject([]);
  });
});
