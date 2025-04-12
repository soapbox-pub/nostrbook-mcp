import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import {
  CallToolResultSchema,
  ListToolsResultSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { assertEquals } from '@std/assert';

import { NostrMcpServer } from './NostrMcpServer.ts';

Deno.test('NostrMcpServer', async (t) => {
  // deno-lint-ignore require-await
  const mockFetch: typeof fetch = async (input, init) => {
    const { url } = new Request(input, init);
    switch (url) {
      case 'https://raw.githubusercontent.com/nostr-protocol/nips/refs/heads/master/01.md':
        return new Response('NIP-01');
      default:
        return new Response('Not Found', { status: 404 });
    }
  };

  const server = new NostrMcpServer({ fetch: mockFetch });

  const client = new Client({
    name: 'test client',
    version: '1.0',
  });

  const [clientTransport, serverTransport] = InMemoryTransport
    .createLinkedPair();

  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);

  await t.step('tools/list', async () => {
    const result = await client.request(
      { method: 'tools/list' },
      ListToolsResultSchema,
    );

    assertEquals(result.tools[0].name, 'read_nip');
  });

  await t.step('tools/call', async () => {
    const result = await client.request(
      {
        method: 'tools/call',
        params: { name: 'read_nip', arguments: { nip: '01' } },
      },
      CallToolResultSchema,
    );

    assertEquals(result, { content: [{ type: 'text', text: 'NIP-01' }] });
  });

  await t.step('tools/call (read_kind 404)', async () => {
    const result = await client.request(
      {
        method: 'tools/call',
        params: { name: 'read_kind', arguments: { kind: 31890 } },
      },
      CallToolResultSchema,
    );

    assertEquals(result, {
      content: [{
        type: 'text',
        text:
          "No documentation found for kind 31890. Try using the `read_nips_index` tool to see if it's specified by a NIP.",
      }],
      isError: true,
    });
  });
});
