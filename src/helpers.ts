import { globSync } from 'glob';

/**
 * Perform once.
 * Search for all files within a give directory.
 * Synchronous version is used due to commonjs support.
 */
function getFilesFromDirectory(directory: string, extension: string) {
  const files = globSync(`${directory}/**/*${extension}`, {
    absolute: true,
    nodir: true,
    ignore: ['node_modules/**'],
  });

  return files;
}

export { getFilesFromDirectory };
