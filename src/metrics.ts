import { getChildrenTemplatesName } from './checks';
import { TEMPLATE_VARNAME } from './const';
import { handleInfiniteInclusionError, infiniteInclusionError } from './error-utils';
import { DefinitiveOptions, Metrics } from './interfaces';
import { Store } from './store';

function includeRenderTime(development: boolean) {
  if (!development) return '';

  return `const ɵɵrenderDuration = (performance.now() - ɵɵstart).toFixed(2);`;
}

function includeChildren(development: boolean) {
  if (!development) return '';

  return `const ɵɵchildren = this.childrenStore.get(this.parentTemplate) || [];`;
}

function updateChildrenStoreInCachedTemplate(
  childrenStore: Store<string[]>,
  filename: string,
  parentTemplate: string,
  development: boolean
) {
  if (!development) return;

  const previousChildren = childrenStore.get(parentTemplate) || [];
  if (previousChildren.includes(filename)) {
    const error = infiniteInclusionError(filename, previousChildren);
    throw error;
  }

  const children = previousChildren.concat(filename);
  childrenStore.set(parentTemplate, children);
}

function updateChildrenStore(
  childrenStore: Store<string[]>,
  content: string,
  filename: string,
  parentTemplate: string,
  config: DefinitiveOptions
) {
  const { development, extension } = config;
  if (!development) return [];

  const children = getChildrenTemplatesName(content, extension);
  const previousChildren = childrenStore.get(parentTemplate) || [];
  const allChildren = previousChildren.concat(children);

  handleInfiniteInclusionError(allChildren, filename);
  childrenStore.set(parentTemplate, allChildren);

  return children;
}

/**
 * Display metrics in the browser. Do not include logs if disabled or if the current template is included in another template. Make data available in the console.
 */
function includeMetrics(metricsData: Metrics) {
  const { cacheEnabled, filename: filename, files, development } = metricsData;
  if (!development) return '""';

  const templatesPathWithDirectory = getFileNameAndAbsPath(files);

  return `'<script>const data = ' + JSON.stringify(${TEMPLATE_VARNAME}) + ';console.log(${logRendered(
    filename
  )});${logChildTemplatesCount()};${logRenderTime()};console.log(${logCache(
    cacheEnabled
  )});${logCacheHit()};${logMappedTemplates(templatesPathWithDirectory)}</script>'`;
}

function logMappedTemplates(templates: string[]) {
  const logs = templates
    .map(
      (template, i) => `console.log("%c#${i + 1} %c${template}", "color: #888", "color: #87cefa");`
    )
    .join('');

  return `console.group("%cMAPPED TEMPLATES (${templates.length})", "color: #00ffcc; font-weight: bold");${logs}console.groupEnd();`;
}

function logCacheHit() {
  return `console.log("%c[CACHE HIT]%c   ' + ɵɵcacheHit + '", "color:rgb(255, 0, 221);font-weight:bold",${getNormalStyle()})`;
}

function logCache(cacheEnabled: boolean) {
  const isEnabled = cacheEnabled ? 'enabled' : 'disabled';

  return `"%c[CACHE]%c       ${isEnabled}", "color: #ff4d4d;font-weight:bold", ${getNormalStyle()}`;
}

function logRendered(template: string) {
  return `"%c[RENDERED]%c    ${template}", "color: #00ff99;font-weight:bold", ${getNormalStyle()}`;
}

function logChildTemplatesCount() {
  const children = `(ɵɵchildren.length ? ɵɵchildren.join(", ") : "")`;

  return `console.log("%c[CHILDREN]%c    ' + ${children} + '", "color: #66ccff;font-weight:bold",${getNormalStyle()})`;
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
  includeChildren,
  updateChildrenStore,
  updateChildrenStoreInCachedTemplate,
};
