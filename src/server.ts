import path from 'node:path';
import { Tao } from './tao';
import { Options } from './interfaces';

const tao = new Tao({ views: path.join(__dirname) });

const res = tao.render('template', { name: 'Tao' });
console.log(res);

// const options: Options = {
//   parse: {
//     exec: '-',
//     interpolate: '',
//     raw: '@',
//   },
// };

// const tao = new Tao(options);
// const templateName = '@header';
// const headerPartial = `
//     <header>
//       <h1><% title %></h1>
//     </header>
//   `;
// tao.loadTemplate(templateName, headerPartial);
// const result = tao.render(templateName, { title: 'my title' });
