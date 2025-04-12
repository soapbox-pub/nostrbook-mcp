import { assertEquals, assertRejects } from '@std/assert';

import { HTTPError } from './HTTPError.ts';
import { NostrbookClient } from './NostrbookClient.ts';

Deno.test('NostrbookClient', async (t) => {
  // deno-lint-ignore require-await
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

  await t.step('readKind', async () => {
    const doc = await client.readKind(1);
    assertEquals(doc, 'Kind: 1');
  });

  await t.step('readTag', async () => {
    const doc = await client.readTag('p');
    assertEquals(doc, 'Tag: p');
  });

  await t.step('readProtocol', async () => {
    const doc = await client.readProtocol('relay');
    assertEquals(doc, 'Protocol: relay');
  });

  await t.step('readKind with 404', async () => {
    await assertRejects(
      () => client.readKind(999),
      HTTPError,
      'HTTP Error: 404 GET https://nostrbook.test/kinds/999.md',
    );
  });
});
