import { Tao } from '../../src/index';
import path from 'path';
import { normalizeFilesPath } from '../../src/utils';

const templateViews = path.join(__dirname, 'templates');
const tao = new Tao({ views: templateViews });

describe('basic render tests', () => {
  it('should render simple template', () => {
    const data = { name: 'test' };
    const result = tao.render('simple', data);
    expect(result).toBe(`Hi ${data.name}`);
  });

  it('should render a path with extension', () => {
    const result = tao.render('simple.html', { name: 'this is simple' });

    expect(result).toContain('this is simple');
  });

  it('should render fullpath defined templates', () => {
    const fullPath = normalizeFilesPath(path.join(templateViews, 'simple.html'));

    const data = { name: 'test' };
    const result = tao.render(fullPath, data);
    expect(result).toContain(`Hi ${data.name}`);
  });

  it('should render simple template with an include', () => {
    const data = { name: 'test included' };
    const result = tao.render('simple-2', data);
    expect(result).toContain(`Hi ${data.name}<h3>Hello from included</h3>`);
  });

  it('include should inherit data from the parent template', () => {
    const data = {
      name: 'test included',
      varFromParent: 'from the parent',
      definedInParent: 'defined at init',
    };
    const varInParent = { definedInParent: 'defined in parent' };

    const result = tao.render('simple-3', data);
    expect(result).toContain(`Hi ${data.name}`);
    expect(result).toContain(`<h1>${data.varFromParent}</h1>`);
    expect(result).toContain(`<h3>${varInParent.definedInParent}</h3>`);
  });

  it('should lazy cache template by default', () => {
    const templateNameWithExtension = 'simple-2.html';
    const data = { name: 'test included' };
    tao.render(templateNameWithExtension, data);

    expect(tao.compiledStore.get(templateNameWithExtension)).toBeTruthy();
  });

  it('dynamictemplatesStore should store dynamical defined template', () => {
    const templateName = '@header1';
    const headerPartial = `
    <header>
      <h1><%= title %></h1>
    </header>
  `;
    tao.loadTemplate(templateName, headerPartial);

    expect(tao.dynamictemplatesStore.getAll()).toHaveProperty(templateName);
  });

  it('should render @header2', () => {
    const headerPartial = `
    <header>
      <h1><%= title %></h1>
    </header>
  `;
    const data = { title: 'this is my partial' };
    tao.loadTemplate('@header2', headerPartial);
    const result = tao.render('@header2', data);

    expect(result).toContain(`<h1>${data.title}</h1>`);
  });

  it('should render dynamically defined template with an include', () => {
    const headerPartial = `
    <header>
      <h1><%= title %></h1>
      <%~ include('simple') %>
    </header>
  `;
    const data = { title: 'this is my partial', name: 'included' };
    tao.loadTemplate('@header3', headerPartial);
    const result = tao.render('@header3', data);

    expect(result).toContain(`<h1>${data.title}</h1>`);
    expect(result).toContain(`Hi ${data.name}`);
  });

  it('should render cached dynamic templates', () => {
    const headerPartial = `
    <header>
      <h1><%= title %></h1>
    </header>
  `;
    const data = { title: 'this is my partial' };
    tao.loadTemplate('@header4', headerPartial);
    tao.render('@header4', data);

    const dataErased = 'another title';
    data.title = dataErased;
    const result = tao.render('@header4', data);

    expect(result).toContain(dataErased);
  });
});
