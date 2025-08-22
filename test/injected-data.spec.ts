import path from 'node:path';
import { Tao } from '../src';
import fs from 'fs';
import { Data, Helpers, UserData } from '../src/interfaces';
import { findTemplateInMappedTemplates } from '../src/templates-access';

const templateViews = path.join(process.cwd(), 'test/templates');
const tao = new Tao({ views: templateViews, development: true });

describe('testing injected user data', () => {
  it('should create file if user data file is unexisting', () => {
    const data = { name: 'testing' };
    tao.render('simple', data);

    const userDataFilePath = path.join(process.cwd(), '.vscode/tao-user-data.json');

    const pathDoesExist = fs.existsSync(userDataFilePath);
    expect(pathDoesExist).toBe(true);
  });

  it('should add different data if tao-user-data.json exists and rendered filename is not yet stored in json file', () => {
    const datas: Data = { name: 'testing', thisIsANum: 5 };
    const add = (a: number, b: number) => a + b;
    const sub = (a: number, b: number) => a - b;
    const helpers: Helpers = { add, sub };

    const mul = (a: number, b: number) => a * b;
    tao.defineHelpers({ mul });
    tao.render('included', datas, helpers);

    const userDataFilePath = path.join(process.cwd(), '.vscode/tao-user-data.json');
    const data = fs.readFileSync(userDataFilePath, 'utf8');
    const parsed: UserData[] = JSON.parse(data);

    const files = findTemplateInMappedTemplates(tao.mappedFiles, 'included.html');
    const templateFilePath = files[0];

    expect(parsed.length).toBe(2);
    expect(parsed.at(-1)!.template).toBe(templateFilePath);
  });
});
