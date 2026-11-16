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
