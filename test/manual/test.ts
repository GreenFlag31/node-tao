import path from 'node:path';
import { Tao } from '../../src';

const tao = new Tao({ views: path.join(__dirname), development: true });

const res = tao.render('template', { name: 'Tao' });
console.log(res);
