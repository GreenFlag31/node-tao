import { Eta } from '../src/index copy';
import path from 'path';

const templateViews = path.join(process.cwd(), 'test copy/templates');
const eta = new Eta({ views: templateViews, metrics: false });

describe('basic render tests', () => {
  it('should render simple template', () => {
    const data = { name: 'test' };
    const result = eta.render('simple', data);
    expect(result).toBe(`Hi ${data.name}`);
  });

  it('should render simple template with an include', () => {
    const data = { name: 'test included' };
    const result = eta.render('simple-2', data);
    expect(result).toContain(`Hi ${data.name} <h3>Hello from included</h3>`);
  });
});
