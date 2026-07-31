import { extractPlainHttpUrls, normalizeHttpUrl } from './link-values';

describe('link values', () => {
  it('normalizes HTTP URLs without changing query strings', () => {
    expect(
      normalizeHttpUrl(' HTTPS://Example.COM:443/docs/?b=2&a=1#section '),
    ).toEqual({
      domain: 'example.com',
      normalizedUrl: 'https://example.com/docs?b=2&a=1',
      url: 'https://example.com/docs?b=2&a=1',
    });
  });

  it('rejects non HTTP protocols', () => {
    expect(normalizeHttpUrl('ftp://example.com/file')).toBeNull();
  });

  it('extracts plain URLs next to Chinese punctuation', () => {
    expect(
      extractPlainHttpUrls(
        '文档 https://example.com/docs，预览 https://test.dev/x。',
      ),
    ).toEqual(['https://example.com/docs', 'https://test.dev/x']);
  });
});
