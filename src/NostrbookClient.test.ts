import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import { NostrbookClient } from './NostrbookClient.ts';

test('NostrbookClient', async (t) => {
  const mockFetch: typeof fetch = async (input, init) => {
    const { url } = new Request(input, init);
    switch (url) {
      case 'https://nostrbook.test/kinds/1.md':
        return new Response('Kind: 1');
      case 'https://nostrbook.test/tags/p.md':
        return new Response('Tag: p');
      case 'https://nostrbook.test/protocol/relay.md':
        return new Response('Protocol: relay');
      default:
        return new Response('Not Found', { status: 404 });
    }
  };

  const client = new NostrbookClient({
    baseUrl: 'https://nostrbook.test',
    fetch: mockFetch,
  });

  await t.test('readKind', async () => {
    const doc = await client.readKind(1);
    assert.equal(doc, 'Kind: 1');
  });

  await t.test('readTag', async () => {
    const doc = await client.readTag('p');
    assert.equal(doc, 'Tag: p');
  });

  await t.test('readProtocol', async () => {
    const doc = await client.readProtocol('relay');
    assert.equal(doc, 'Protocol: relay');
  });

  await t.test('readKind with 404', async () => {
    await assert.rejects(
      () => client.readKind(999),
      {
        name: 'HTTPError',
        message: 'HTTP Error: 404 GET https://nostrbook.test/kinds/999.md',
      }
    );
  });
});
