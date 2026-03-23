import { options, Tao } from '../../src';
import path from 'path';
import { randomUUID } from 'crypto';
import { DEFAULT_EXTENSION } from '../../src/const';
import { defaultConfig } from '../../src/default-config';
import { normalizeFilesPath } from '../../src/utils';

describe('tao constructor', () => {
  it('initialisation', () => {
    const tao = new Tao();
    const currentConfig = tao['config'];
    expect(currentConfig).toStrictEqual(defaultConfig);
  });

  it('should merge config', () => {
    const currentConf = { cache: true, tags: { opening: '{{', closing: '}}' } };

    const tao = new Tao(currentConf);
    const conf = tao['config'];

    const finalConf: options = {
      ...defaultConfig,
      ...currentConf,
    };
    expect(conf).toMatchObject(finalConf);
  });

  it('should throw if opening and closing tags are equal', () => {
    const customConfig = { tags: { opening: '{{', closing: '{{' } };
    expect(() => new Tao(customConfig)).toThrow('Opening and closing tag should be different');
  });

  it('should throw if parse values are duplicated', () => {
    const customConfig: options = { parse: { exec: '<%', interpolate: '<%' } };
    expect(() => new Tao(customConfig)).toThrow(
      `Cannot have the same parse value at 'exec' and 'interpolate' with value '<%'`,
    );
  });

  it('No template files should have been found', () => {
    const templateViews = path.join(process.cwd(), `unexisting-path-${randomUUID()}`);
    const tao = new Tao({ views: templateViews });

    expect(tao['templatePaths'].length).toBe(0);
  });

  it('Simple template files should be found', () => {
    const templateViews = path.join(__dirname, 'templates');
    const tao = new Tao({ views: templateViews });

    const pathWithSimpleSlash = normalizeFilesPath(
      path.join(templateViews, `simple.${DEFAULT_EXTENSION}`),
    );

    expect(tao['templatePaths']).toContain(pathWithSimpleSlash);
  });

  it('Metrics should be available when enabled', () => {
    const templateViews = path.join(__dirname, 'templates');
    const tao = new Tao({ views: templateViews, development: true });

    const result = tao.render('simple', { name: 'test' });

    // tao-dt is the id of the devtools panel
    expect(result).toContain('tao-dt'); 
  });

  it('should handle dynamic child component', () => {
    const tao = new Tao({ development: true });
    const parentComponent = `
    <header>
      <h1><%= parentTitle %></h1>
      <%~ include('@childComponent') %>
    </header>
  `;
    const childComponent = `
    <div>
      <h1><%= childTitle %></h1>
    </div>
  `;
    const parentTitle = { parentTitle: 'parent data', childTitle: 'child data' };
    tao.loadTemplate('@parentComponent', parentComponent);
    tao.loadTemplate('@childComponent', childComponent);
    const result = tao.render('@parentComponent', parentTitle);

    expect(result).toContain(`<h1>${parentTitle.parentTitle}</h1>`);
    expect(result).toContain(`<h1>${parentTitle.childTitle}</h1>`);
  });

  it('should handle dynamic child component (both parent and child are cached)', () => {
    const tao = new Tao({ development: true });
    const parentComponent = `
    <header>
      <h1><%= parentTitle %></h1>
      <%~ include('@childComponent') %>
    </header>
  `;
    const childComponent = `
    <div>
      <h1><%= childTitle %></h1>
    </div>
  `;
    const parentTitle = { parentTitle: 'parent data', childTitle: 'child data' };
    tao.loadTemplate('@parentComponent', parentComponent);
    tao.loadTemplate('@childComponent', childComponent);
    const result = tao.render('@parentComponent', parentTitle);
    const result2 = tao.render('@parentComponent', parentTitle);

    expect(result2).toContain(`<h1>${parentTitle.parentTitle}</h1>`);
    expect(result2).toContain(`<h1>${parentTitle.childTitle}</h1>`);
  });
});
