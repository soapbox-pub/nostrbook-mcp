import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer, type Socket } from 'node:net';
import { WebSocketServer } from 'ws';
import { finalizeEvent, nip19 } from 'nostr-tools';
import { EventClient } from '../src/EventClient.ts';

test('real relay protocol returns signed events and closes connections', { timeout: 10_000 }, async (t) => {
  const relay = new WebSocketServer({ port: 0, host: '127.0.0.1' });
  await once(relay, 'listening');
  t.after(() => { for (const socket of relay.clients) socket.terminate(); relay.close(); });
  const address = relay.address();
  assert.ok(address && typeof address !== 'string');
  const event = finalizeEvent({ kind: 1, created_at: 1, tags: [], content: 'local relay test' }, new Uint8Array(32).fill(1));
  let requests = 0;
  let closed: Promise<unknown> | undefined;
  relay.on('connection', (socket) => {
    closed = once(socket, 'close');
    socket.on('message', (data) => {
      const [type, subscription, filter] = JSON.parse(data.toString());
      if (type === 'REQ') {
        requests++;
        assert.deepEqual(filter, { ids: [event.id] });
        socket.send(JSON.stringify(['EVENT', subscription, event]));
        socket.send(JSON.stringify(['EOSE', subscription]));
      }
    });
  });
  const client = new EventClient({ relays: [`ws://127.0.0.1:${address.port}`], timeoutMs: 1000 });
  assert.deepEqual(await client.fetch(nip19.noteEncode(event.id)), event);
  assert.equal(requests, 1);
  await closed;
  assert.equal(relay.clients.size, 0);
});

test('silent relay times out and is disconnected', { timeout: 10_000 }, async (t) => {
  const relay = new WebSocketServer({ port: 0, host: '127.0.0.1' });
  await once(relay, 'listening');
  t.after(() => { for (const socket of relay.clients) socket.terminate(); relay.close(); });
  const address = relay.address();
  assert.ok(address && typeof address !== 'string');
  let closed: Promise<unknown> | undefined;
  relay.on('connection', (socket) => { closed = once(socket, 'close'); });
  const client = new EventClient({ relays: [`ws://127.0.0.1:${address.port}`], timeoutMs: 150 });
  await assert.rejects(client.fetch(nip19.noteEncode('a'.repeat(64))), /timed out|aborted/i);
  await closed;
  assert.equal(relay.clients.size, 0);
});

test('relay that never completes the WebSocket handshake cannot hang a lookup', { timeout: 10_000 }, async (t) => {
  // Accepts TCP but never answers, so the socket never opens or emits close.
  const sockets = new Set<Socket>();
  const server = createServer((socket) => { sockets.add(socket); socket.on('error', () => {}); });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { for (const socket of sockets) socket.destroy(); server.close(); });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const client = new EventClient({ relays: [`ws://127.0.0.1:${address.port}`], timeoutMs: 150, cleanupTimeoutMs: 100 });
  const started = Date.now();
  await assert.rejects(client.fetch(nip19.noteEncode('a'.repeat(64))), /timed out|aborted/i);
  assert.ok(Date.now() - started < 2_000);
});
