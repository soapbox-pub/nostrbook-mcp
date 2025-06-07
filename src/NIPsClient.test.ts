import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import { NIPsClient } from './NIPsClient.ts';

test('NIPsClient', async (t) => {
  const mockFetch: typeof fetch = async (input, init) => {
    const { url } = new Request(input, init);
    switch (url) {
      case 'https://git.test/nostr-protocol/nips/refs/heads/master/01.md':
        return new Response('NIP-01');
      case 'https://git.test/nostr-protocol/nips/refs/heads/master/README.md':
        return new Response('NIPs');
      case 'https://git.test/nostr-protocol/nips/refs/heads/master/BREAKING.md':
        return new Response('Breaking Changes');
      default:
        return new Response('Not Found', { status: 404 });
    }
  };

  const client = new NIPsClient({
    urlTemplate:
      'https://git.test/nostr-protocol/nips/refs/heads/master/{nip}.md',
    fetch: mockFetch,
  });

  await t.test('readNip', async () => {
    const doc = await client.readNip('01');
    assert.equal(doc, 'NIP-01');
  });

  await t.test('readIndex', async () => {
    const doc = await client.readIndex();
    assert.equal(doc, 'NIPs');
  });

  await t.test('readBreaking', async () => {
    const doc = await client.readBreaking();
    assert.equal(doc, 'Breaking Changes');
  });

  await t.test('readNip with 404', async () => {
    await assert.rejects(
      () => client.readNip('abc'),
      {
        name: 'HTTPError',
        message: 'HTTP Error: 404 GET https://git.test/nostr-protocol/nips/refs/heads/master/abc.md',
      }
    );
  });
});
