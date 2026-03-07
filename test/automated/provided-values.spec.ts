import path from 'node:path';
import { Tao } from '../../src';

const templateViews = path.join(__dirname, 'templates');
const tao = new Tao({ views: templateViews, development: false });

describe('testing injected user data', () => {
  it('NaN should stay NaN when given to the template for a simple NaN value', () => {
    const result = tao.render('simple', { name: NaN });

    expect(result).toContain('Hi NaN');
  });

  it('NaN should stay NaN when given to the template for values inside an object', () => {
    const data = { results: [{ NaNValue: NaN }] };
    const result = tao.render('simple-iteration', data);

    expect(result).toContain('<p>NaN</p>');
  });

  it('Infinity should stay Infinity when given to the template for values inside an object', () => {
    const data = { results: [{ InfinityValue: Infinity }] };
    const result = tao.render('simple-iteration', data);

    expect(result).toContain('<p>Infinity</p>');
  });

  it('NaN value inside an object is a real NaN value', () => {
    const data = { results: [{ NaNValue: NaN }] };
    const result = tao.render('simple-iteration', data);

    expect(result).toContain('<p>isNaN: true</p>');
  });

  it('Infinity value inside an object is a real Infinity value', () => {
    const data = { results: [{ InfinityValue: Infinity }] };
    const result = tao.render('simple-iteration', data);

    expect(result).toContain('<p>isInfinite: true</p>');
  });
});
