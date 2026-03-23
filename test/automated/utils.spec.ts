import path from 'node:path';
import {
  escapeJSLiteral,
  getResolvedPath,
  initVariablesAndHelpers,
  XMLEscape,
} from '../../src/utils';
import { normalizeFilesPath } from '../../src/templates-access';

const views = path.join(__dirname, 'templates');

describe('initVariablesAndHelpers', () => {
  it('getFullPath should return a complete path when the path is not absolute', () => {
    const template = 'simple.eta';

    const result = getResolvedPath(views, template, 'strict');
    const normalized = normalizeFilesPath(path.join(views, template));
    expect(result).toBe(normalized);
  });

  it('getFullPath should return a complete path when the path is absolute', () => {
    const template = 'simple.eta';
    const completePath = path.join(views, template);

    const result = getResolvedPath(views, completePath, 'strict');
    expect(result).toBe(completePath);
  });
});

describe('initVariablesAndHelpers', () => {
  it('should generate const declarations from simple data', () => {
    const input = { name: 'Tao', age: 42, isActive: true };
    const result = initVariablesAndHelpers(input);
    expect(result).toBe('const name = "Tao";const age = 42;const isActive = true;');
  });

  it('should handle empty object', () => {
    const input = {};
    const result = initVariablesAndHelpers(input);
    expect(result).toBe('');
  });

  it('should support functions as values', () => {
    const input = {
      greet: function () {
        return 'hello';
      },
    };
    const result = initVariablesAndHelpers(input);
    expect(result).toMatch(/^const greet = function.*\{\s*return 'hello';\s*\};$/s);
  });
});

describe('initVariablesAndHelpers — key validation', () => {
  // --- valid keys ---
  it.each([
    ['simple lowercase', 'name'],
    ['underscore prefix', '_private'],
    ['dollar prefix', '$jquery'],
    ['camelCase', 'camelCase'],
    ['PascalCase', 'PascalCase'],
    ['digit after first char', 'a1'],
    ['single underscore', '_'],
    ['single dollar', '$'],
    ['trailing digits', 'key123'],
  ])('should accept valid key: %s', (_label, key) => {
    expect(() => initVariablesAndHelpers({ [key]: 'value' })).not.toThrow();
  });

  // --- invalid keys ---
  it('should throw for an empty string key', () => {
    expect(() => initVariablesAndHelpers({ '': 'value' })).toThrow(
      'Invalid data key: "". Keys must be valid JavaScript identifiers.',
    );
  });

  it('should throw for a key starting with a digit', () => {
    expect(() => initVariablesAndHelpers({ '1invalid': 'value' })).toThrow('Invalid data key');
  });

  it('should throw for a key containing a hyphen', () => {
    expect(() => initVariablesAndHelpers({ 'key-with-dash': 'value' })).toThrow('Invalid data key');
  });

  it('should throw for a key containing a space', () => {
    expect(() => initVariablesAndHelpers({ 'key with space': 'value' })).toThrow(
      'Invalid data key',
    );
  });

  it('should throw for a key containing a dot', () => {
    expect(() => initVariablesAndHelpers({ 'key.with.dot': 'value' })).toThrow('Invalid data key');
  });

  it('should throw for a key containing a newline', () => {
    expect(() => initVariablesAndHelpers({ 'key\n': 'value' })).toThrow('Invalid data key');
  });

  it('should throw for a key containing a semicolon', () => {
    expect(() => initVariablesAndHelpers({ 'key;': 'value' })).toThrow('Invalid data key');
  });

  it('should throw for a basic injection attempt in a key', () => {
    expect(() =>
      initVariablesAndHelpers({ "x = 1; require('evil')//": 'value' }),
    ).toThrow('Invalid data key');
  });

  it('should throw for an RCE injection attempt in a key', () => {
    expect(() =>
      initVariablesAndHelpers({
        "x; require('child_process').execSync('rm -rf /')": 'value',
      }),
    ).toThrow('Invalid data key');
  });

  it('should throw on the first invalid key even if other keys are valid', () => {
    expect(() =>
      initVariablesAndHelpers({ validKey: 'ok', 'invalid-key': 'value', anotherValid: 'ok' }),
    ).toThrow('Invalid data key: "invalid-key"');
  });
});

describe('initVariablesAndHelpers — value serialization safety', () => {
  it('should safely serialize a string containing single quotes', () => {
    const result = initVariablesAndHelpers({ v: "'; process.exit()" });
    expect(result).toBe(`const v = "'; process.exit()";`);
  });

  it('should safely serialize a string containing double quotes', () => {
    const result = initVariablesAndHelpers({ v: '"injection"' });
    expect(result).toBe(`const v = "\\"injection\\"";`);
  });

  it('should serialize a number', () => {
    expect(initVariablesAndHelpers({ n: 42 })).toBe('const n = 42;');
  });

  it('should serialize a boolean', () => {
    expect(initVariablesAndHelpers({ b: false })).toBe('const b = false;');
  });

  it('should serialize null', () => {
    expect(initVariablesAndHelpers({ v: null })).toBe('const v = null;');
  });

  it('should serialize an array', () => {
    expect(initVariablesAndHelpers({ arr: [1, 'two', true] })).toBe(
      `const arr = [1,"two",true];`,
    );
  });

  it('should serialize a nested object', () => {
    expect(initVariablesAndHelpers({ obj: { a: 1, b: 'x' } })).toBe(
      `const obj = {"a":1,"b":"x"};`,
    );
  });

  it('should fall back to null for a circular reference', () => {
    const circular: any = { a: 1 };
    circular.self = circular;
    const result = initVariablesAndHelpers({ data: circular });
    expect(result).toBe('const data = null;');
  });

  it('should fall back to null when toJSON throws', () => {
    const evil = {
      toJSON() {
        throw new Error('toJSON exploded');
      },
    };
    const result = initVariablesAndHelpers({ data: evil });
    expect(result).toBe('const data = null;');
  });

  it('should continue processing remaining keys after a value falls back to null', () => {
    const circular: any = {};
    circular.self = circular;
    const result = initVariablesAndHelpers({ bad: circular, good: 'ok' });
    expect(result).toBe('const bad = null;const good = "ok";');
  });
});

describe('XMLEscape', () => {
  it('should return the same string if no special characters', () => {
    expect(XMLEscape('Hello World')).toBe('Hello World');
  });

  it('should escape & to &amp;', () => {
    expect(XMLEscape('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('should escape < and >', () => {
    expect(XMLEscape('<div>Test</div>')).toBe('&lt;div&gt;Test&lt;/div&gt;');
  });

  it('should escape " and \'', () => {
    expect(XMLEscape('"Hello" and \'World\'')).toBe('&quot;Hello&quot; and &#39;World&#39;');
  });

  it('should escape a string with all special characters', () => {
    expect(XMLEscape(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });

  it('should convert non-string inputs to string', () => {
    expect(XMLEscape(42)).toBe('42');
    expect(XMLEscape(true)).toBe('true');
    expect(XMLEscape(null)).toBe('');
    expect(XMLEscape(undefined)).toBe('');
  });

  it('should handle empty string', () => {
    expect(XMLEscape('')).toBe('');
  });
});

describe('escapeJSLiteral', () => {
  it('should escape single quotes', () => {
    expect(escapeJSLiteral("I'm fine")).toBe("I\\'m fine");
  });

  it('should escape backslashes', () => {
    expect(escapeJSLiteral('Path: C:\\temp')).toBe('Path: C:\\\\temp');
  });

  it('should escape newlines (\\n)', () => {
    expect(escapeJSLiteral('Line1\nLine2')).toBe('Line1\\nLine2');
  });

  it('should escape carriage returns (\\r)', () => {
    expect(escapeJSLiteral('Line1\rLine2')).toBe('Line1\\nLine2');
  });

  it('should escape Windows line endings (\\r\\n)', () => {
    expect(escapeJSLiteral('Line1\r\nLine2')).toBe('Line1\\nLine2');
  });

  it('should handle mixed escaping', () => {
    const input = "I'm using \\ and \nnewlines";
    const expected = "I\\'m using \\\\ and \\nnewlines";
    expect(escapeJSLiteral(input)).toBe(expected);
  });

  it('should return empty string if input is empty', () => {
    expect(escapeJSLiteral('')).toBe('');
  });
});
