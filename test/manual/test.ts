import path from 'node:path';
import { Tao } from '../../src';

const tao = new Tao({ views: path.join(__dirname), development: false });

const res = tao.render('template', { name: 'Tao', included: 'content included' });
console.log(res);
