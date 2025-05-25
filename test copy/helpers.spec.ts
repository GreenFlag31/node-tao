import { getPathWithExtension, isTemplateFileInsideGivenDirectory } from '../src/checks';

describe('checks function tests', () => {
  it('getPathWithExtension should return a path with its extension when the filePath does not contain the extension', () => {
    const result = getPathWithExtension('simple', 'eta');
    expect(result).toBe('simple.eta');
  });

  it('getPathWithExtension should return a path with its extension when the filePath contains the extension', () => {
    const result = getPathWithExtension('simple.eta', 'eta');
    expect(result).toBe('simple.eta');
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
