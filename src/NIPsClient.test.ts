import { assertEquals, assertRejects } from '@std/assert';

import { HTTPError } from './HTTPError.ts';
import { NIPsClient } from './NIPsClient.ts';

Deno.test('NIPsClient', async (t) => {
  // deno-lint-ignore require-await
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

  await t.step('readNip', async () => {
    const doc = await client.readNip('01');
    assertEquals(doc, 'NIP-01');
  });

  await t.step('readIndex', async () => {
    const doc = await client.readIndex();
    assertEquals(doc, 'NIPs');
  });

  await t.step('readBreaking', async () => {
    const doc = await client.readBreaking();
    assertEquals(doc, 'Breaking Changes');
  });

  await t.step('readNip with 404', async () => {
    await assertRejects(
      () => client.readNip('abc'),
      HTTPError,
      'HTTP Error: 404 GET https://git.test/nostr-protocol/nips/refs/heads/master/abc.md',
    );
  });
});
