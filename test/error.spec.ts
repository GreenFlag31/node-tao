import { randomUUID } from 'crypto';
import { Tao } from '../src/index';
import path from 'path';

const templateViews = path.join(process.cwd(), 'test/templates');
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

  it('should return nothing when there is an error inside a template with debug set to false (execution error)', () => {
    const result = tao.render('execution-error');

    expect(result).toContain('');
  });

  it('should return nothing when there is an error inside a template with debug set to false (compilation error)', () => {
    const result = tao.render('compilation-error');

    expect(result).toContain('');
  });

  it('should return the error template provided in the library when debug is set to true (compilation error)', () => {
    const tao = new Tao({ views: templateViews, debug: true });
    const result = tao.render('compilation-error');

    expect(result).toContain('<h2>An error occurred</h2>');
  });

  it('should not return any content of the parent template if there is a bug in a child template with debug set to false', () => {
    const tao = new Tao({ views: templateViews });
    const result = tao.render('include-error-child', { name: 'parent data' });

    expect(result).toContain('');
  });

  it('should not return any content of the parent template if there is a bug in a child template with debug set to true', () => {
    const tao = new Tao({ views: templateViews, debug: true });
    const data = { name: 'parent data' };
    const result = tao.render('include-error-child', data);

    expect(result).not.toContain(`<h1>Hi ${data.name} %></h1>`);
  });

  it('should handle Parse error', () => {
    const tao = new Tao({ views: templateViews, debug: true });
    const result = tao.render('simple-parse-error');

    expect(result).toContain(
      `Unclosed string &quot; &#39; &quot; at line 1 in simple-parse-error.html`
    );
  });

  it('should handle infinite inclusion error', () => {
    const tao = new Tao({ views: templateViews, debug: true });
    const result = tao.render('infinite-inclusion-1');

    expect(result).toContain(`Possible infinite inclusion detected`);
  });
});
