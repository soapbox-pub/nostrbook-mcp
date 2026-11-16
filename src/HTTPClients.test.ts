import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { NIPsClient } from './NIPsClient.ts';
import { NostrbookClient } from './NostrbookClient.ts';

test('both documentation clients abort stalled HTTP requests', async (t) => {
  const server = createServer(() => {});
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}`;
  await assert.rejects(new NIPsClient({ urlTemplate: `${url}/{nip}`, timeoutMs: 30 }).readNip('01'), { name: 'TimeoutError' });
  await assert.rejects(new NostrbookClient({ baseUrl: url, timeoutMs: 30 }).readKind(1), { name: 'TimeoutError' });
});

test('tag names cannot inject query strings or paths', async () => {
  const client = new NostrbookClient({ baseUrl: 'https://example.test', fetch: async (input) => {
    assert.equal(new Request(input).url, 'https://example.test/tags/a%2Fb%3Fc%23d.md');
    return new Response('tag');
  } });
  assert.equal(await client.readTag('a/b?c#d'), 'tag');
});
