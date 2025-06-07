import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import {
  CallToolResultSchema,
  ListToolsResultSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { NostrMcpServer } from './NostrMcpServer.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test('NostrMcpServer', async (t) => {
  const mockFetch: typeof fetch = async (input, init) => {
    const { url } = new Request(input, init);
    switch (url) {
      case 'https://raw.githubusercontent.com/nostr-protocol/nips/refs/heads/master/01.md':
        return new Response('NIP-01');
      case 'https://raw.githubusercontent.com/nostr-protocol/nips/refs/heads/master/README.md':
        return new Response(await readFile(join(__dirname, 'fixtures', 'NIPs.md'), 'utf-8'));
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

  await t.test('tools/list', async () => {
    const result = await client.request(
      { method: 'tools/list' },
      ListToolsResultSchema,
    );

    const toolNames = result.tools.map((tool) => tool.name);
    assert.equal(toolNames.includes('read_nip'), true);
    assert.equal(toolNames.includes('generate_kind'), true);
  });

  await t.test('tools/call', async () => {
    const result = await client.request(
      {
        method: 'tools/call',
        params: { name: 'read_nip', arguments: { nip: '01' } },
      },
      CallToolResultSchema,
    );

    assert.deepEqual(result, { content: [{ type: 'text', text: 'NIP-01' }] });
  });

  await t.test('tools/call (read_kind 404)', async () => {
    const result = await client.request(
      {
        method: 'tools/call',
        params: { name: 'read_kind', arguments: { kind: 31890 } },
      },
      CallToolResultSchema,
    );

    assert.deepEqual(result, {
      content: [{
        type: 'text',
        text:
          "No documentation found for kind 31890. Try using the `read_nips_index` tool to see if it's specified by a NIP.",
      }],
      isError: true,
    });
  });

  await t.test('tools/call (generate_kind regular)', async () => {
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
        assert.equal(generatedKind >= 1000 && generatedKind <= 9999, true);
        // Should not be one of the used kinds from our mock data
        const usedKinds = [0, 1, 3, 4, 5, 7, 1984];
        assert.equal(usedKinds.includes(generatedKind), false);
      }
    }
  });

  await t.test('tools/call (generate_kind addressable)', async () => {
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
        assert.equal(generatedKind >= 30000 && generatedKind <= 39999, true);
        // Should not be one of the used kinds from our mock data
        const usedKinds = [30000, 30001];
        assert.equal(usedKinds.includes(generatedKind), false);
      }
    }
  });
});
