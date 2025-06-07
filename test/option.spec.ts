import path from 'node:path';
import { options, Tao } from '../src';

describe('Initialisation option', () => {
  it('should render template with custom delimitators', () => {
    const options: options = {
      tags: {
        opening: '{{',
        closing: '}}',
      },
    };

    const tao = new Tao(options);
    const templateName = '@header';
    const headerPartial = `
    <header>
      <h1>{{= title }}</h1>
    </header>
  `;
    tao.loadTemplate(templateName, headerPartial);
    const result = tao.render(templateName, { title: 'my title' });

    expect(result).toContain('<h1>my title</h1>');
  });

  it('should render template with custom prefix', () => {
    const options: options = {
      parse: {
        exec: '-',
        interpolate: '',
        raw: '@',
      },
    };

    const tao = new Tao(options);
    const templateName = '@header';
    const headerPartial = `
    <header>
      <h1><% title %></h1>
    </header>
  `;
    tao.loadTemplate(templateName, headerPartial);
    const result = tao.render(templateName, { title: 'my title' });

    expect(result).toContain('<h1>my title</h1>');
  });

  it('should render a template with fileResolution set to strict', () => {
    const templateViews = path.join(process.cwd(), 'test');
    const options: options = {
      fileResolution: 'strict',
      views: templateViews,
    };

    const tao = new Tao(options);
    const result = tao.render('templates/simple', { name: 'my title' });

    expect(result).toContain('Hi my title');
  });

  describe('custom escapeFunction', () => {
    it('should use custom escape function', () => {
      const customEscape = (str: unknown): string => {
        return String(str).replace(/[<>]/g, (match) => {
          return match === '<' ? '[LT]' : '[GT]';
        });
      };

      const options: options = {
        escapeFunction: customEscape,
        autoEscape: true,
      };
      const tao = new Tao(options);
      const templateName = '@custom-escape';
      const template = '<div><%= html %>}}</div>';

      tao.loadTemplate(templateName, template);
      const result = tao.render(templateName, {
        html: '<span>test</span>',
      });

      expect(result).toContain('[LT]span[GT]test[LT]/span[GT]');
    });
  });

  it('should work with custom file extension', () => {
    const templateViews = path.join(process.cwd(), 'test');
    const options: options = { extension: 'tpl', views: templateViews };
    const tao = new Tao(options);

    expect(tao.mappedFiles.length).toBe(1);
  });

  it('should throw error if duplicated parsing option value', () => {
    const options: options = { parse: { raw: '' } };

    expect(() => new Tao(options)).toThrowError('Cannot have the same parse value');
  });
});
