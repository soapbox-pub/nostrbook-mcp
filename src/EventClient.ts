import { NPool, NRelay1, type NostrEvent, type NostrFilter } from '@nostrify/nostrify';
import { nip19 } from 'nostr-tools';

export const DEFAULT_RELAYS = [
  'wss://relay.ditto.pub', 'wss://relay.primal.net',
  'wss://relay.damus.io', 'wss://nos.lol',
];
export const COMMUNITY_RELAYS = ['wss://relay.ditto.pub', 'wss://relay.dreamith.to'];

export interface EventPool {
  query(filters: NostrFilter[], opts: { signal: AbortSignal; relays: string[] }): Promise<NostrEvent[]>;
  close(): Promise<void>;
}

export interface EventClientOpts {
  relays?: string[];
  timeoutMs?: number;
  cleanupTimeoutMs?: number;
  createPool?: () => EventPool;
}

/** One short-lived pool per lookup; relay hints get a bounded first attempt. */
export class EventClient {
  private opts: EventClientOpts;

  constructor(opts: EventClientOpts = {}) {
    this.opts = opts;
  }

  /** Initiate shutdown, but never let a missing WebSocket close event block a tool. */
  private async close(pool: EventPool): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        Promise.resolve().then(() => pool.close()).catch(() => {}),
        new Promise<void>((resolve) => { timer = setTimeout(resolve, this.opts.cleanupTimeoutMs ?? 500); }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  async searchCommunityNips(opts: { query?: string; limit?: number; kind?: number; author?: string }, signal?: AbortSignal) {
    const relays = this.opts.relays ?? COMMUNITY_RELAYS;
    const pool = this.opts.createPool?.() ?? new NPool({
      open: (url) => new NRelay1(url),
      reqRouter: (filters) => new Map(relays.map((url) => [url, filters])),
      eventRouter: () => relays,
    });
    const limit = opts.limit ?? 20;
    const filter: NostrFilter = { kinds: [30817], limit };
    if (opts.query?.trim()) filter.search = opts.query.trim();
    if (opts.kind !== undefined) filter['#k'] = [String(opts.kind)];
    if (opts.author) filter.authors = [opts.author];
    const timeout = AbortSignal.timeout(this.opts.timeoutMs ?? 8_000);
    const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
    try {
      requestSignal.throwIfAborted();
      const events = await pool.query([filter], { relays, signal: requestSignal });
      signal?.throwIfAborted();
      if (!events.length && timeout.aborted) throw new Error('Community NIP search timed out');
      const latest = new Map<string, NostrEvent>();
      for (const event of events) {
        const d = event.tags.find(([name]) => name === 'd')?.[1];
        const title = event.tags.find(([name]) => name === 'title')?.[1];
        if (event.kind !== 30817 || !d || !title) continue;
        const key = `${event.pubkey}:${d}`;
        const previous = latest.get(key);
        if (!previous || event.created_at > previous.created_at ||
          (event.created_at === previous.created_at && event.id < previous.id)) latest.set(key, event);
      }
      const results = [...latest.values()];
      if (!filter.search) results.sort((a, b) => b.created_at - a.created_at || a.id.localeCompare(b.id));
      return results.slice(0, limit).map((event) => {
        const identifier = event.tags.find(([name]) => name === 'd')![1]!;
        const naddr = nip19.naddrEncode({ kind: 30817, pubkey: event.pubkey, identifier, relays });
        return {
          title: event.tags.find(([name]) => name === 'title')![1],
          author: event.pubkey, identifier, eventId: event.id, createdAt: event.created_at,
          kinds: event.tags.filter(([name]) => name === 'k').map(([, kind]) => kind),
          preview: event.content.slice(0, 500), naddr, url: `https://nostrhub.io/${naddr}`,
        };
      });
    } finally {
      await this.close(pool);
    }
  }

  async fetch(identifier: string, signal?: AbortSignal): Promise<NostrEvent | undefined> {
    const decoded = nip19.decode(identifier);
    let filter: NostrFilter;
    let hints: string[] = [];
    switch (decoded.type) {
      case 'npub': filter = { kinds: [0], authors: [decoded.data], limit: 1 }; break;
      case 'note': filter = { ids: [decoded.data] }; break;
      case 'nprofile':
        filter = { kinds: [0], authors: [decoded.data.pubkey], limit: 1 };
        hints = decoded.data.relays ?? [];
        break;
      case 'nevent':
        filter = { ids: [decoded.data.id] };
        hints = decoded.data.relays ?? [];
        break;
      case 'naddr':
        filter = { kinds: [decoded.data.kind], authors: [decoded.data.pubkey], '#d': [decoded.data.identifier] };
        hints = decoded.data.relays ?? [];
        break;
      default: throw new Error('Unsupported identifier type; use npub, nprofile, note, nevent, or naddr');
    }
    const defaults = this.opts.relays ?? DEFAULT_RELAYS;
    hints = [...new Set(hints)].filter((relay) => {
      try { return ['ws:', 'wss:'].includes(new URL(relay).protocol); } catch { return false; }
    });
    const pool = this.opts.createPool?.() ?? new NPool({
      open: (url) => new NRelay1(url),
      reqRouter: (filters) => new Map(defaults.map((url) => [url, filters])),
      eventRouter: () => defaults,
    });
    const timeoutMs = this.opts.timeoutMs ?? 8_000;
    const query = async (relays: string[]) => {
      const timeout = AbortSignal.timeout(timeoutMs);
      const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
      requestSignal.throwIfAborted();
      const events = await pool.query([filter], { relays, signal: requestSignal });
      signal?.throwIfAborted();
      if (!events.length && timeout.aborted) throw new Error('Relay lookup timed out');
      return events.sort((a, b) => b.created_at - a.created_at || a.id.localeCompare(b.id))[0];
    };
    try {
      if (hints.length) {
        try {
          const event = await query(hints);
          if (event) return event;
        } catch (error) {
          if (signal?.aborted) throw error;
          // A dead hint must not prevent a lookup on the default relays.
        }
      }
      return await query(defaults);
    } finally {
      await this.close(pool);
    }
  }
}
