import { checkAccessPermission } from '../../src/templates-access';
import { getPathWithExtension } from '../../src/validations';

describe('checks function tests', () => {
  it('getPathWithExtension should return a path with its extension when the filePath does not contain the extension', () => {
    const result = getPathWithExtension('simple', 'eta');
    expect(result).toBe('simple.eta');
  });

  it('getPathWithExtension should return a path with its extension when the filePath contains the extension', () => {
    const result = getPathWithExtension('simple.eta', 'eta');
    expect(result).toBe('simple.eta');
  });

  it('checkAccessPermission should contains templatePath', () => {
    const templatePaths = ['D:\\Manu\\Desktop\\Code\\eta-lib\\test\\simple.eta'];
    const templateFile = 'simple.eta';
    const result = checkAccessPermission(templatePaths, templateFile);
    expect(result).toMatchObject(templatePaths);
  });

  it('checkAccessPermission should be empty', () => {
    const templatePaths = ['D:\\Manu\\Desktop\\Code\\eta-lib\\test\\simple.eta'];
    const templateFile = 'unexistant.eta';
    const result = checkAccessPermission(templatePaths, templateFile);
    expect(result).toMatchObject([]);
  });
});
