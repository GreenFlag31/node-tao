import { log } from 'console';
import { Metrics } from './interfaces';

function includeRenderTime(metrics: boolean, isAChild: boolean) {
  if (!metrics || isAChild) return '';

  return `const ɵɵrenderDuration = (performance.now() - ɵɵstart).toFixed(2);`;
}

function includeChildTemplatesCount(metrics: boolean, isAChild: boolean) {
  if (!metrics || isAChild) return '';

  return `const ɵɵchildTemplates = this.childCopy;`;
}

function isAChildTemplate(templateName: string, childTemplates: string[]) {
  return childTemplates.includes(templateName);
}

function resetChildTemplatesIfParentTemplates(filename: string, childTemplates: string[]) {
  if (isAChildTemplate(filename, childTemplates)) return childTemplates;

  return [];
}

/**
 * Logs metrics in the browser. Do not include logs if disabled or if the current template is included in another template.
 */
function includeMetrics(metricsData: Metrics) {
  const { cacheEnabled, filename, files, metrics, templateLoaded, isAChild } = metricsData;

  if (!metrics || isAChild) return '""';

  const templatesPathWithDirectory = getFileNameAndAbsPath(files);
  const includeDynamicalTemplates = includeDynamicalDefinedTemplate(templateLoaded);
  const filesNumber = templatesPathWithDirectory.length;

  return `'<script>console.log(${logRendered(
    filename
  )});${logChildTemplatesCount()};${logRenderTime()};console.log(${logCache(
    cacheEnabled
  )});${logCacheHit()};console.log(${logTemplatesMapped(
    filesNumber
  )});${includeDynamicalTemplates};${logMappedTemplates(templatesPathWithDirectory)}</script>'`;
}

function includeDynamicalDefinedTemplate(templateLoaded: string[]) {
  // const dynamicalTemplateNumber = templateLoaded.length;
  // if (dynamicalTemplateNumber === 0) return '""';
  // const dynamicalTemplate = `DYNAMIC TEMPLATE${dynamicalTemplateNumber > 1 ? 'S' : ''}`;
  // return `console.log(${setTitleStyle(
  //   dynamicalTemplate,
  //   dynamicalTemplateNumber
  // )});console.table(${JSON.stringify(templateLoaded)});`;
}

function logMappedTemplates(templates: string[]) {
  const logs = templates
    .map((tpl, i) => `console.log("%c#${i + 1} %c${tpl}", "color: #888", "color: #87cefa");`)
    .join('');

  return `console.group("%cMAPPED TEMPLATES (${templates.length})", "color: #00ffcc; font-weight: bold");${logs}console.groupEnd();`;
}

function logCache(cacheEnabled: boolean) {
  const isEnabled = cacheEnabled ? 'enabled' : 'disabled';

  return `"%c[CACHE]%c       ${isEnabled}", "color: #00bfff;font-weight:bold", ${getNormalStyle()}`;
}

function logTemplatesMapped(templateNumber: number) {
  return `"%c[TEMPLATES]%c   ${templateNumber}", "color: #bb86fc;font-weight:bold", ${getNormalStyle()}`;
}

function logRendered(template: string) {
  return `"%c[RENDERED]%c    ${template}", "color: #00ff99;font-weight:bold", ${getNormalStyle()}`;
}

function logChildTemplatesCount() {
  return `console.log("%c[CHILDREN]%c   ' + ɵɵchildTemplates.join(', ') + ' (' + ɵɵchildTemplates.length + ')' + '", "color: #66ccff;font-weight:bold",${getNormalStyle()})`;
}

function logCacheHit() {
  return `console.log("%c[CACHE HIT]%c   ' + ɵɵcacheHit + '", "color: #ff4d4d;font-weight:bold",${getNormalStyle()})`;
}

function logRenderTime() {
  return `console.log("%c[RENDER TIME]%c ' + ɵɵrenderDuration + 'ms", "color: #ffa500;font-weight:bold",${getNormalStyle()})`;
}

/**
 * Takes into account the parent directory.
 */
function getFileNameAndAbsPath(files: string[]) {
  const templatesPathWithDirectory: string[] = [];

  for (const file of files) {
    const fileName = file.split('/').slice(-2).join('/');
    templatesPathWithDirectory.push(fileName);
  }

  return templatesPathWithDirectory;
}

function getNormalStyle() {
  return `"color: #fff"`;
}

export {
  getFileNameAndAbsPath,
  getNormalStyle,
  includeMetrics,
  includeRenderTime,
  includeChildTemplatesCount,
  resetChildTemplatesIfParentTemplates,
  isAChildTemplate,
};
