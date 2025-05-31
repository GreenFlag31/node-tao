import { randomUUID } from 'crypto';
import { Eta } from '../src/index copy';
import path from 'path';

const templateViews = path.join(process.cwd(), 'test copy/templates');
const eta = new Eta({ views: templateViews });

describe('error render', () => {
  it('should return nothing when trying to access an unexisting template', () => {
    const result = eta.render(`/helpers${randomUUID()}`);

    expect(result).toContain('');
  });

  it('should return nothing when trying to access a template out of scope', () => {
    const result = eta.render(`../../src/templates/simple`);

    expect(result).toContain('');
  });

  it('should return nothing when there is an error inside a template with debug set to false (execution error)', () => {
    const result = eta.render('error');

    expect(result).toContain('');
  });

  it('should return nothing when there is an error inside a template with debug set to false (compilation error)', () => {
    const result = eta.render('compilation-error');

    expect(result).toContain('');
  });
});
