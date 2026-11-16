import assert from 'node:assert/strict';
import { NIPsClient } from '../src/NIPsClient.ts';
import { NostrbookClient } from '../src/NostrbookClient.ts';
import { KindGenerator } from '../src/KindGenerator.ts';
import { EventClient } from '../src/EventClient.ts';

const nips = new NIPsClient({ urlTemplate: 'https://raw.githubusercontent.com/nostr-protocol/nips/refs/heads/master/{nip}.md' });
const book = new NostrbookClient({ baseUrl: 'https://nostrbook.dev' });
for (const [name, read] of [
  ['NIP-01', () => nips.readNip('01')],
  ['kind 1', () => book.readKind(1)],
  ['tag p', () => book.readTag('p')],
  ['protocol event', () => book.readProtocol('event')],
] as const) {
  const text = await read();
  assert.ok(text.length > 100 && !/^\s*<!doctype html/i.test(text), `Invalid documentation: ${name}`);
  console.log(`PASS ${name}`);
}
const kinds = KindGenerator.extractUsedKinds(await nips.readIndex());
assert.ok(kinds.has(0) && kinds.has(1) && kinds.has(30023));
console.log(`PASS NIPs index (${kinds.size} listed kinds)`);
if (process.env.NOSTR_SMOKE_IDENTIFIER) {
  assert.ok(await new EventClient().fetch(process.env.NOSTR_SMOKE_IDENTIFIER), 'No event returned');
  console.log('PASS live relay event lookup');
}
