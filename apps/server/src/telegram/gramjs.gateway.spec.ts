import { Api } from 'telegram';
import { extractMessageUrls } from './gramjs.gateway';

describe('extractMessageUrls', () => {
  it('extracts Telegram entities with UTF-16 emoji offsets', () => {
    const text = '🚀 https://example.com/docs';
    const message = new Api.Message({
      date: 1,
      entities: [
        new Api.MessageEntityUrl({
          length: 'https://example.com/docs'.length,
          offset: 3,
        }),
      ],
      id: 1,
      message: text,
      peerId: new Api.PeerUser({ userId: 1n as never }),
    });

    expect(extractMessageUrls(message)).toEqual(['https://example.com/docs']);
  });

  it('extracts hidden text links', () => {
    const message = new Api.Message({
      date: 1,
      entities: [
        new Api.MessageEntityTextUrl({
          length: 2,
          offset: 0,
          url: 'https://design.example.com/file',
        }),
      ],
      id: 2,
      message: '设计稿',
      peerId: new Api.PeerUser({ userId: 1n as never }),
    });

    expect(extractMessageUrls(message)).toEqual([
      'https://design.example.com/file',
    ]);
  });
});
