import { Eta } from '../src/index copy';
import path from 'path';

const templateViews = path.join(process.cwd(), 'test copy/templates');
const eta = new Eta({ views: templateViews });

describe('render tests', () => {
  it('should render simple template', () => {
    const data = { name: 'test' };
    const result = eta.render('simple', data);
    expect(result).toBe(`Hi ${data.name}`);
  });
});
