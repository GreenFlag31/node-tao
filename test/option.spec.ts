import path from 'node:path';
import { options, Tao } from '../src';
import { log } from 'node:console';

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
});
