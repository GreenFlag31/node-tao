import path from 'node:path';

function getFileNameAndAbsPath(files: string[]) {
  const filesNameAndPath = [];
  const separator = path.sep;

  for (const file of files) {
    const fileName = file.split(separator).at(-1);
    const nameAndPath = { name: fileName };
    filesNameAndPath.push(nameAndPath);
  }

  return filesNameAndPath;
}

function setTitleStyle(title: string, value: any = '') {
  return `"%c[${title}]%c: ${value}", "color: white; background: green; padding: 2px; font-weight: bold;","color:normal"`;
}

export interface Metrics {
  filesMapped: string[];
  renderTime: number;
  cacheHit: boolean;
}

export { getFileNameAndAbsPath, setTitleStyle };
