import path from 'node:path';
import { escapeJSLiteral, getResolvedPath, initVariablesAndHelpers, XMLEscape } from '../src/utils';
import { normalizeFilesPath } from '../src/templates-access';

describe('initVariablesAndHelpers', () => {
  it('getFullPath should return a complete path when the path is not absolute', () => {
    const views = path.join(process.cwd(), 'test/templates');
    const template = 'simple.eta';

    const result = getResolvedPath(views, template, 'strict');
    const normalized = normalizeFilesPath(path.join(views, template));
    expect(result).toBe(normalized);
  });

  it('getFullPath should return a complete path when the path is absolute', () => {
    const views = path.join(process.cwd(), 'test/templates');
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
