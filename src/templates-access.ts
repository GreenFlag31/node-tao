import { globSync } from 'glob';
import { normalizeFilesPath } from './utils';

/**
 * Perform once.
 * Search for all files within a given directory.
 * Normalize paths on Windows.
 */
function getFilesFromDirectory(directory: string, extension: string) {
  const files = globSync(`${directory}/**/*.${extension}`, {
    absolute: true,
    nodir: true,
  });

  const normalizedPaths = files.map((file) => normalizeFilesPath(file));
  return normalizedPaths;
}

/**
 * Security measure to restrict access only to files within a previously mapped directory.
 */
function checkAccessPermission(templatePaths: string[], templateFile: string) {
  const files = templatePaths.filter((path) => path.endsWith(templateFile));

  return files;
}

export { getFilesFromDirectory, checkAccessPermission, normalizeFilesPath };
