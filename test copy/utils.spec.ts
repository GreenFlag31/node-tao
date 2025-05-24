import { Parse } from '../src/interfaces';
import { buildPrefixRegex, initVariablesAndHelpers } from '../src/utils';

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

describe('buildPrefixRegex', () => {
  it('should return an empty string if all prefixes are undefined', () => {
    const parseOptions: Parse = {};
    expect(buildPrefixRegex(parseOptions)).toBe('');
  });

  it('should include only defined prefixes', () => {
    const parseOptions: Parse = { interpolate: '=', exec: undefined, raw: '~' };
    expect(buildPrefixRegex(parseOptions)).toBe('=|~');
  });

  it('should escape special characters', () => {
    const parseOptions: Parse = { exec: '*', interpolate: '$', raw: '^' };
    expect(buildPrefixRegex(parseOptions)).toBe('\\*|\\$|\\^');
  });

  it('should handle empty string as a prefix', () => {
    const parseOptions: Parse = { exec: '', interpolate: '=', raw: '' };
    expect(buildPrefixRegex(parseOptions)).toBe('=');
  });

  it('should handle interpolate: "=", raw: "~"', () => {
    const parseOptions: Parse = { exec: '', interpolate: '=', raw: '~' };
    expect(buildPrefixRegex(parseOptions)).toBe('=|~');
  });
});
