import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { nip19 } from 'nostr-tools';
import { NostrMcpServer } from './NostrMcpServer.ts';

test('all tools: successful calls, invalid inputs, and upstream errors', async (t) => {
  let status = 200;
  let body = '| `1` | note |';
  let kind = 1;
  let missing = false;
  const event = { id: 'a'.repeat(64), pubkey: 'b'.repeat(64), created_at: 10, kind, content: 'document', tags: [], sig: 'c'.repeat(128) };
  const server = new NostrMcpServer({ name: 'test', version: '1',
    fetch: async () => new Response(body, { status }),
    events: { async fetch() { return missing ? undefined : { ...event, kind }; } },
  });
  const client = new Client({ name: 'test', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  t.after(async () => { await client.close(); await server.close(); });
  await Promise.all([client.connect(a), server.connect(b)]);
  const tools = await client.listTools();
  assert.deepEqual(tools.tools.map((tool) => tool.name).sort(), [
    'fetch_event', 'generate_kind', 'read_kind', 'read_nip', 'read_nips_index', 'read_protocol', 'read_tag',
  ]);
  const calls = [
    { name: 'read_nip', arguments: { nip: '01' } },
    { name: 'read_kind', arguments: { kind: 1 } },
    { name: 'read_tag', arguments: { tag: 'p' } },
    { name: 'read_protocol', arguments: { doc: 'event' } },
    { name: 'read_nips_index', arguments: {} },
    { name: 'generate_kind', arguments: { range: 'regular' } },
  ];
  for (const call of calls) {
    const result = await client.callTool(call);
    assert.notEqual(result.isError, true, call.name);
    assert.ok(Array.isArray(result.content) && result.content.length);
  }
  const fetchCall = { name: 'fetch_event', arguments: { identifier: nip19.noteEncode(event.id) } };
  assert.deepEqual((await client.callTool(fetchCall)).content, [{ type: 'text', text: JSON.stringify(event, null, 2) }]);
  kind = 30817;
  assert.deepEqual((await client.callTool(fetchCall)).content, [{ type: 'text', text: 'document' }]);
  missing = true;
  assert.equal((await client.callTool(fetchCall)).isError, true);

  for (const call of [
    { name: 'read_nip', arguments: { nip: '../01' } },
    ...[-1, 1.5, 65536].map((kind) => ({ name: 'read_kind', arguments: { kind } })),
    { name: 'read_tag', arguments: { tag: '' } },
    { name: 'read_tag', arguments: { tag: '..' } },
    { name: 'read_protocol', arguments: { doc: '../event' } },
    { name: 'generate_kind', arguments: { range: 'invalid' } },
    { name: 'fetch_event', arguments: { identifier: 'broken' } },
    { name: 'fetch_event', arguments: { identifier: nip19.nsecEncode(new Uint8Array(32).fill(1)) } },
  ]) assert.equal((await client.callTool(call)).isError, true, JSON.stringify(call));

  for (const errorStatus of [404, 429, 500]) {
    status = errorStatus;
    for (const call of calls) assert.equal((await client.callTool(call)).isError, true, `${call.name}: ${status}`);
  }
  status = 200;
  body = 'unexpected upstream format';
  assert.equal((await client.callTool({ name: 'generate_kind', arguments: { range: 'regular' } })).isError, true);
});
