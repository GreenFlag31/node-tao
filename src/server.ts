import path from 'node:path';
import { Tao } from './tao';

const tao = new Tao({ views: path.join(__dirname) });

const res = tao.render('template', { name: 'Tao' });
console.log(res); // <h1>Hi Tao!</h1>
