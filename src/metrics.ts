import { metricsDisabled } from './checks';
import { Metrics } from './interfaces';

function includeRenderTime(metrics: boolean) {
  if (metricsDisabled(metrics)) return '';

  return `const renderDuration = (performance.now() - start).toFixed(2);`;
}

function includeChildTemplatesCount(metrics: boolean) {
  if (metricsDisabled(metrics)) return '';

  return `const childTemplatesCount = this.childTemplates.length`;
}

function isAChildTemplate(templateName: string, childTemplates: string[]) {
  return childTemplates.includes(templateName);
}

function resetChildTemplatesIfParentTemplates(filename: string, childTemplates: string[]) {
  if (isAChildTemplate(filename, childTemplates)) return childTemplates;

  return [];
}

/**
 * Include logs in the browser. Do not include log if disabled or if the current template is included in another template.
 */
function includeMetrics(metricsData: Metrics) {
  const { cacheEnabled, filename, files, metrics, templateLoaded, childTemplates } = metricsData;
  if (metricsDisabled(metrics)) return '""';
  if (isAChildTemplate(filename, childTemplates)) return '""';

  const filesNameAndPath = getFileNameAndAbsPath(files);
  const includeDynamicalTemplates = includeDynamicalDefinedTemplate(templateLoaded);
  const filesNumber = filesNameAndPath.length;
  const templateRendered = 'TEMPLATE RENDERED';
  const cache = 'CACHE ENABLED';
  const templatesMapped = 'TEMPLATES MAPPED';

  return `'<script>console.log(${setTitleStyle(
    templateRendered,
    filename
  )});${logChildTemplatesCount()};${logRenderTime()};console.log(${setTitleStyle(
    cache,
    cacheEnabled
  )});${logCacheHit()};console.log(${setTitleStyle(
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

function logChildTemplatesCount() {
  return `console.log("%c[CHILD TEMPLATES]%c: ' + childTemplatesCount + '", ${getTitleStyle()},${getNormalStyle()})`;
}

function logCacheHit() {
  return `console.log("%c[CACHE HIT]%c: ' + cacheHit + '", ${getTitleStyle()},${getNormalStyle()})`;
}

function logRenderTime() {
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
  includeMetrics,
  includeRenderTime,
  includeChildTemplatesCount,
  resetChildTemplatesIfParentTemplates,
};
