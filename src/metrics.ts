import { metricsDisabledOrInProduction } from './checks';
import { Metrics } from './interfaces';

function includeRenderTime(metrics: boolean) {
  if (metricsDisabledOrInProduction(metrics)) return '';

  return `const renderDuration = (performance.now() - this.startRenderTime).toFixed(2);`;
}

function includeCacheHit(metrics: boolean) {
  if (metricsDisabledOrInProduction(metrics)) return '';

  return `const cacheHit = this.cacheHit;`;
}

function includeMetrics(metricsData: Metrics) {
  const { cacheEnabled, filename, files, metrics, templateLoaded } = metricsData;
  if (metricsDisabledOrInProduction(metrics)) return '""';

  const filesNameAndPath = getFileNameAndAbsPath(files);
  const includeDynamicalTemplates = includeDynamicalDefinedTemplate(templateLoaded);
  const filesNumber = filesNameAndPath.length;
  const templatesMapped = 'TEMPLATES MAPPED';
  const templateRendered = 'TEMPLATE RENDERED';
  const cache = 'CACHE ENABLED';

  return `'<script>console.log(${setTitleStyle(
    templateRendered,
    filename
  )});${getRenderTime()};console.log(${setTitleStyle(
    cache,
    cacheEnabled
  )});${getCacheHit()};console.log(${setTitleStyle(
    templatesMapped,
    filesNumber
  )});console.table(${JSON.stringify(filesNameAndPath)});${includeDynamicalTemplates}</script>'`;
}

function includeDynamicalDefinedTemplate(templateLoaded: string[]) {
  const dynamicalTemplateNumber = templateLoaded.length;
  if (dynamicalTemplateNumber === 0) return '""';

  const dynamicalTemplate = `DYNAMIC TEMPLATE${dynamicalTemplateNumber > 1 ? 'S' : ''}`;

  return `console.log(${setTitleStyle(
    dynamicalTemplate,
    dynamicalTemplateNumber
  )});console.table(${JSON.stringify(templateLoaded)});`;
}

function getCacheHit() {
  return `console.log("%c[CACHE HIT]%c: ' + cacheHit + '", ${getTitleStyle()},${getNormalStyle()})`;
}

function getRenderTime() {
  return `console.log("%c[RENDER TIME]%c: ' + renderDuration + 'ms", ${getTitleStyle()},${getNormalStyle()})`;
}

function getFileNameAndAbsPath(files: string[]) {
  const filesNameAndPath = [];

  for (const file of files) {
    const fileName = file.split('/').slice(-2).join('/');
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
