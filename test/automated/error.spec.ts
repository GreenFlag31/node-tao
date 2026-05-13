import { randomUUID } from 'crypto';
import { Tao } from '../../src/index';
import path from 'path';

const templateViews = path.join(__dirname, 'templates');
const tao = new Tao({ views: templateViews });

describe('error render', () => {
  it('should return nothing when trying to access an unexisting template', () => {
    const result = tao.render(`/helpers${randomUUID()}`);

    expect(result).toContain('');
  });

  it('should return nothing when trying to access a template out of scope', () => {
    const result = tao.render(`../../src/templates/simple`);

    expect(result).toContain('');
  });

  it('should return nothing when there is an error inside a template with development set to false (execution error)', () => {
    const result = tao.render('execution-error');

    expect(result).toContain('');
  });

  it('should return nothing when there is an error inside a template with development set to false (compilation error)', () => {
    const result = tao.render('compilation-error');

    expect(result).toContain('');
  });

  it('should return the error template provided in the library when development is set to true (compilation error)', () => {
    const tao = new Tao({ views: templateViews, development: true });
    const result = tao.render('compilation-error');

    expect(result).toContain('<h2>An error occurred</h2>');
  });

  it('should not return any content of the parent template if there is a bug in a child template with development set to false', () => {
    const tao = new Tao({ views: templateViews });
    const result = tao.render('include-error-child', { name: 'parent data' });

    expect(result).toContain('');
  });

  it('should not return any content of the parent template if there is a bug in a child template with development set to true', () => {
    const tao = new Tao({ views: templateViews, development: true });
    const data = { name: 'parent data' };
    const result = tao.render('include-error-child', data);

    expect(result).not.toContain(`<h1>Hi ${data.name} %></h1>`);
  });

  it('should handle Parse error', () => {
    const tao = new Tao({ views: templateViews, development: true });
    const result = tao.render('simple-parse-error');

    expect(result).toContain(`Unclosed single quote`);
  });

  it('should handle template unclosed prefix', () => {
    const tao = new Tao({ views: templateViews, development: true });
    const headerPartial = `
    <header>
      <h1><%= title </h1>
    </header>
  `;
    const data = { title: 'this is my partial' };
    tao.loadTemplate('@header2', headerPartial);
    const result = tao.render('@header2', data);

    expect(result).toContain(`>Unclosed template block`);
  });

  it('should handle not unique child template', () => {
    const tao = new Tao({ views: templateViews, development: true });
    const fullURL = path.join(templateViews, 'not unique.html');

    const result = tao.render(fullURL);

    expect(result).toContain('');
  });

  it('should handle wrong type in child template', () => {
    const tao = new Tao({ views: templateViews, development: true });
    const headerPartial = `
    <header>
      <h1><%~ include('wrongly typed') %></h1>
    </header>
  `;

    tao.loadTemplate('@headerPartial', headerPartial);
    const result = tao.render('@headerPartial');

    expect(result).toContain('');
  });
});

describe('security', () => {
  it('should block path traversal via include and return empty string', () => {
    const tao = new Tao({ views: templateViews });
    tao.loadTemplate('@traversal', `<%~ include('../../../package.json') %>`);
    const result = tao.render('@traversal');
    expect(result).toBe('');
  });
});

describe('error-utils edge cases', () => {
  it('findOriginalLineNumberWithMessage should not throw when error has no stack', () => {
    const { findOriginalLineNumberWithMessage } = require('../../src/error-utils');

    const err = new Error('runtime crash');
    delete (err as any).stack;
    (err as any).type = 'Execution Error';

    expect(() => {
      findOriginalLineNumberWithMessage(err, 'compiled content', 'original content');
    }).not.toThrow();

    const [message, lines, lineNumber] = findOriginalLineNumberWithMessage(
      err,
      'compiled content',
      'original content',
    );
    expect(message).toBe('runtime crash');
    expect(lines).toEqual([]);
    expect(lineNumber).toBeNull();
  });
});
