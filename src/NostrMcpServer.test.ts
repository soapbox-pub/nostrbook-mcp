import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import {
  CallToolResultSchema,
  ListToolsResultSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { assertEquals } from '@std/assert';

import { NostrMcpServer } from './NostrMcpServer.ts';

Deno.test('NostrMcpServer', async (t) => {
  const mockFetch: typeof fetch = async (input, init) => {
    const { url } = new Request(input, init);
    switch (url) {
      case 'https://raw.githubusercontent.com/nostr-protocol/nips/refs/heads/master/01.md':
        return new Response('NIP-01');
      case 'https://raw.githubusercontent.com/nostr-protocol/nips/refs/heads/master/README.md':
        return new Response(await Deno.readTextFile('./src/fixtures/NIPs.md'));
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

    const toolNames = result.tools.map((tool) => tool.name);
    assertEquals(toolNames.includes('read_nip'), true);
    assertEquals(toolNames.includes('generate_kind'), true);
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

  await t.step('tools/call (generate_kind regular)', async () => {
    const result = await client.request(
      {
        method: 'tools/call',
        params: { name: 'generate_kind', arguments: { range: 'regular' } },
      },
      CallToolResultSchema,
    );

    // The result should contain a kind number between 1000-9999 that's not in our mock data
    const content = result.content?.[0];
    if (content?.type === 'text') {
      const kindMatch = content.text.match(/Generated unused kind: (\d+)/);
      if (kindMatch) {
        const generatedKind = parseInt(kindMatch[1], 10);
        // Should be in regular range
        assertEquals(generatedKind >= 1000 && generatedKind <= 9999, true);
        // Should not be one of the used kinds from our mock data
        const usedKinds = [0, 1, 3, 4, 5, 7, 1984];
        assertEquals(usedKinds.includes(generatedKind), false);
      }
    }
  });

  await t.step('tools/call (generate_kind addressable)', async () => {
    const result = await client.request(
      {
        method: 'tools/call',
        params: { name: 'generate_kind', arguments: { range: 'addressable' } },
      },
      CallToolResultSchema,
    );

    // The result should contain a kind number between 30000-39999 that's not in our mock data
    const content = result.content?.[0];
    if (content?.type === 'text') {
      const kindMatch = content.text.match(/Generated unused kind: (\d+)/);
      if (kindMatch) {
        const generatedKind = parseInt(kindMatch[1], 10);
        // Should be in addressable range
        assertEquals(generatedKind >= 30000 && generatedKind <= 39999, true);
        // Should not be one of the used kinds from our mock data
        const usedKinds = [30000, 30001];
        assertEquals(usedKinds.includes(generatedKind), false);
      }
    }
  });
});
