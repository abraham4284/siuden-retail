import { readCookie } from './cookies';

describe('readCookie', () => {
  it('preserves the complete value when the cookie is not the first entry', () => {
    expect(
      readCookie(
        '_ga=analytics; another=value; siuden_storefront_access_token=eyJtoken',
        'siuden_storefront_access_token',
      ),
    ).toBe('eyJtoken');
  });

  it('decodes encoded cookie values', () => {
    expect(readCookie('session=hello%20world', 'session')).toBe('hello world');
  });

  it('returns undefined for a missing or malformed cookie', () => {
    expect(readCookie('other=value', 'session')).toBeUndefined();
    expect(readCookie('session=%E0%A4%A', 'session')).toBeUndefined();
  });
});
