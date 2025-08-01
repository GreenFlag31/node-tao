import { globSync } from 'glob';
import { normalizeFilesPath } from './utils';

/**
 * Perform once.
 * Search for all files within a given directory.
 * Normalize paths on Windows.
 */
function getFilesFromDirectory(directory: string, extension: string) {
  const files = globSync(`${directory}/**/*${extension}`, {
    absolute: true,
    nodir: true,
  });

  const normalizedPaths = files.map((file) => normalizeFilesPath(file));
  return normalizedPaths;
}

/**
 * Security measure to allow access to only files in given directory that has been previously mapped.
 */
function isTemplateFileInsideGivenDirectory(templatePaths: string[], templateFile: string) {
  return templatePaths.filter((path) => path.endsWith(templateFile));
}

function checkAccessPermission(templatePaths: string[], templateFile: string) {
  const files = isTemplateFileInsideGivenDirectory(templatePaths, templateFile);

  return files;
}

function fileIsUnique(files: string[]) {
  return files.length === 1;
}

export {
  getFilesFromDirectory,
  checkAccessPermission,
  isTemplateFileInsideGivenDirectory,
  normalizeFilesPath,
  fileIsUnique,
};
