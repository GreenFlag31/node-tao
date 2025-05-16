import path from 'node:path';
import { metricsDisabledOrInProduction } from './checks';

function includeRenderTime(metrics: boolean) {
  if (metricsDisabledOrInProduction(metrics)) return '';

  return `const renderDuration = (performance.now() - this.startRenderTime).toFixed(2);`;
}

function includeCacheHit(metrics: boolean) {
  if (metricsDisabledOrInProduction(metrics)) return '';

  return `const cacheHit = this.cacheHit;`;
}

function includeMetrics(
  metrics: boolean,
  files: string[],
  filename: string,
  cacheEnabled: boolean
) {
  if (metricsDisabledOrInProduction(metrics)) return '""';

  const filesNameAndPath = getFileNameAndAbsPath(files);
  const filesNumber = filesNameAndPath.length;
  const filesMapped = 'FILES MAPPED';
  const fileRendered = 'FILE RENDERED';
  const cache = 'CACHE ENABLED';

  return `'<script>console.log(${setTitleStyle(
    fileRendered,
    filename
  )});${getRenderTime()};console.log(${setTitleStyle(
    cache,
    cacheEnabled
  )});${getCacheHit()};console.log(${setTitleStyle(
    filesMapped,
    filesNumber
  )});console.table(${JSON.stringify(filesNameAndPath)});</script>'`;
}

function getCacheHit() {
  return `console.log("%c[CACHE HIT]%c: ' + cacheHit + '", ${getTitleStyle()},${getNormalStyle()})`;
}

function getRenderTime() {
  return `console.log("%c[RENDER TIME]%c: ' + renderDuration + 'ms", ${getTitleStyle()},${getNormalStyle()})`;
}

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
  return `"%c[${title}]%c: ${value}", ${getTitleStyle()}, ${getNormalStyle()}`;
}

function getTitleStyle() {
  return `"color: white; background: green; padding: 2px; font-weight: bold;"`;
}

function getNormalStyle() {
  return `"color:normal"`;
}

export {
  getFileNameAndAbsPath,
  setTitleStyle,
  getTitleStyle,
  getNormalStyle,
  getCacheHit,
  getRenderTime,
  includeCacheHit,
  includeMetrics,
  includeRenderTime,
};
