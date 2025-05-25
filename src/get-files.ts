import { globSync } from 'glob';

/**
 * Perform once.
 * Search for all files within a given directory.
 * Normalize paths on Windows.
 */
function getFilesFromDirectory(directory: string, extension: string) {
  const files = globSync(`${directory}/**/*${extension}`, {
    absolute: true,
    nodir: true,
    ignore: ['node_modules/**'],
  });

  const normalizedPaths = files.map((file) => file.replace(/\\/g, '/'));
  return normalizedPaths;
}

export { getFilesFromDirectory };
