import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import { EventClient, type EventPool } from './EventClient.ts';

const pubkey = 'a'.repeat(64);
const event: NostrEvent = { id: 'b'.repeat(64), pubkey, kind: 0, created_at: 10, tags: [], content: '{}', sig: 'c'.repeat(128) };

test('event identifiers route to the correct filters and always close', async (t) => {
  const cases = [
    [nip19.npubEncode(pubkey), { kinds: [0], authors: [pubkey], limit: 1 }],
    [nip19.nprofileEncode({ pubkey }), { kinds: [0], authors: [pubkey], limit: 1 }],
    [nip19.noteEncode(event.id), { ids: [event.id] }],
    [nip19.neventEncode({ id: event.id }), { ids: [event.id] }],
    [nip19.naddrEncode({ pubkey, kind: 30023, identifier: 'article' }), { kinds: [30023], authors: [pubkey], '#d': ['article'] }],
  ] as const;
  for (const [identifier, filter] of cases) {
    await t.test(identifier.slice(0, 12), async () => {
      let closed = false;
      const client = new EventClient({ createPool: () => ({
        async query(filters) { assert.deepEqual(filters, [filter]); return [event]; },
        async close() { closed = true; },
      }) });
      assert.equal(await client.fetch(identifier), event);
      assert.equal(closed, true);
    });
  }
});

test('empty or failing relay hints fall back to defaults and choose newest event', async () => {
  for (const failure of [false, true]) {
    const calls: string[][] = [];
    let closed = false;
    const latest = { ...event, id: '0'.repeat(64), created_at: 20 };
    const client = new EventClient({ relays: ['wss://fallback.test'], createPool: () => ({
      async query(_filters, { relays }) {
        calls.push(relays);
        if (calls.length === 1) {
          if (failure) throw new Error('offline');
          return [];
        }
        return [event, { ...latest, id: '1'.repeat(64) }, latest];
      },
      async close() { closed = true; },
    }) });
    assert.equal(await client.fetch(nip19.nprofileEncode({ pubkey, relays: ['wss://hint.test'] })), latest);
    assert.deepEqual(calls, [['wss://hint.test'], ['wss://fallback.test']]);
    assert.equal(closed, true);
  }
});

test('successful hints avoid fallback; failures and cancellation still close', async () => {
  for (const mode of ['success', 'failure', 'cancel'] as const) {
    let calls = 0;
    let closed = false;
    const controller = new AbortController();
    const pool: EventPool = {
      async query() {
        calls++;
        if (mode === 'failure') throw new Error('offline');
        if (mode === 'cancel') controller.abort(new Error('cancelled'));
        return [event];
      },
      async close() { closed = true; },
    };
    const client = new EventClient({ createPool: () => pool });
    const result = client.fetch(nip19.nprofileEncode({ pubkey, relays: ['wss://hint.test'] }), controller.signal);
    if (mode === 'success') assert.equal(await result, event);
    else await assert.rejects(result, new RegExp(mode === 'failure' ? 'offline' : 'cancelled'));
    assert.equal(calls, mode === 'failure' ? 2 : 1);
    assert.equal(closed, true);
  }
});

test('no result and unsupported private keys', async () => {
  const client = new EventClient({ createPool: () => ({ async query() { return []; }, async close() {} }) });
  assert.equal(await client.fetch(nip19.npubEncode(pubkey)), undefined);
  await assert.rejects(client.fetch(nip19.nsecEncode(new Uint8Array(32).fill(1))), /Unsupported/);
});

test('stalled or rejected cleanup cannot hide results or query errors', { timeout: 1000 }, async () => {
  for (const failQuery of [false, true]) {
    for (const failClose of [false, true]) {
      const client = new EventClient({ cleanupTimeoutMs: 10, createPool: () => ({
        async query() { if (failQuery) throw new Error('query failed'); return [event]; },
        async close() { if (failClose) throw new Error('close failed'); await new Promise(() => {}); },
      }) });
      const result = client.fetch(nip19.noteEncode(event.id));
      if (failQuery) await assert.rejects(result, /query failed/);
      else assert.equal(await result, event);
    }
  }
});

test('community discovery validates, deduplicates, filters and returns fetchable pointers', async () => {
  const old = { ...event, kind: 30817, tags: [['d', 'test'], ['title', 'Test'], ['k', '1234']], content: 'a'.repeat(600) };
  const newer = { ...old, created_at: 20, id: 'd'.repeat(64) };
  const other = { ...old, pubkey: 'e'.repeat(64), created_at: 30 };
  const client = new EventClient({ cleanupTimeoutMs: 10, createPool: () => ({
    async query(filters, { relays }) {
      assert.deepEqual(relays, ['wss://relay.ditto.pub', 'wss://relay.dreamith.to']);
      assert.deepEqual(filters, [{ kinds: [30817], limit: 2, search: 'Test', '#k': ['1234'], authors: [pubkey] }]);
      return [old, newer, { ...old, tags: [] }, other, event];
    },
    async close() { await new Promise(() => {}); },
  }) });
  const results = await client.searchCommunityNips({ query: ' Test ', limit: 2, kind: 1234, author: pubkey });
  assert.equal(results.length, 2);
  assert.equal(results[0]?.eventId, newer.id);
  assert.equal(results[0]?.preview.length, 500);
  assert.deepEqual(results[0]?.kinds, ['1234']);
  assert.deepEqual(nip19.decode(results[0]!.naddr), { type: 'naddr', data: {
    kind: 30817, pubkey, identifier: 'test', relays: ['wss://relay.ditto.pub', 'wss://relay.dreamith.to'],
  } });
});

test('recent community discovery sorts newest first; cancellation closes the pool', async () => {
  let closed = 0;
  const controller = new AbortController();
  const client = new EventClient({ createPool: () => ({
    async query(filters) {
      assert.deepEqual(filters, [{ kinds: [30817], limit: 20 }]);
      return [10, 30].map((created_at) => ({ ...event, kind: 30817, created_at, tags: [['d', String(created_at)], ['title', 'Test']] }));
    },
    async close() { closed++; },
  }) });
  assert.deepEqual((await client.searchCommunityNips({})).map((r) => r.createdAt), [30, 10]);
  controller.abort(new Error('cancelled'));
  await assert.rejects(client.searchCommunityNips({}, controller.signal), /cancelled/);
  assert.equal(closed, 2);
});
