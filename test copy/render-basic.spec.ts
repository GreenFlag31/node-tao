import { Tao } from '../src/index copy';
import path from 'path';

const templateViews = path.join(process.cwd(), 'test copy/templates');
const tao = new Tao({ views: templateViews, metrics: false });

describe('basic render tests', () => {
  it('should render simple template', () => {
    const data = { name: 'test' };
    const result = tao.render('simple', data);
    expect(result).toBe(`Hi ${data.name}`);
  });

  it('should render simple template with an include', () => {
    const data = { name: 'test included' };
    const result = tao.render('simple-2', data);
    expect(result).toContain(`Hi ${data.name} <h3>Hello from included</h3>`);
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
    const data = { name: 'test included' };
    tao.render('simple-2', data);

    const fullPath = path.join(templateViews, 'simple-2.html').replace(/\\/g, '/');
    expect(tao.templatesStore.get(fullPath)).toBeTruthy();
  });

  it('dynamictemplatesStore should store dynamical defined template', () => {
    const templateName = '@header';
    const headerPartial = `
    <header>
      <h1><%= title %></h1>
    </header>
  `;
    tao.loadTemplate(templateName, headerPartial);

    expect(tao.dynamictemplatesStore.getAll()).toHaveProperty(templateName);
  });

  it('should render @header', () => {
    const headerPartial = `
    <header>
      <h1><%= title %></h1>
    </header>
  `;
    const data = { title: 'this is my partial' };
    tao.loadTemplate('@header', headerPartial);
    const result = tao.render('@header', data);

    expect(result).toContain(`<h1>${data.title}</h1>`);
  });

  it('should render fullpath defined templates', () => {
    const fullPath = path.join(templateViews, 'simple.html').replace(/\\/g, '/');
    const data = { name: 'test' };
    const result = tao.render(fullPath, data);
    expect(result).toBe(`Hi ${data.name}`);
  });
});
