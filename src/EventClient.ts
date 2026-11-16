import { NPool, NRelay1, type NostrEvent, type NostrFilter } from '@nostrify/nostrify';
import { nip19 } from 'nostr-tools';

export const DEFAULT_RELAYS = [
  'wss://relay.ditto.pub', 'wss://relay.primal.net',
  'wss://relay.damus.io', 'wss://nos.lol',
];

export interface EventPool {
  query(filters: NostrFilter[], opts: { signal: AbortSignal; relays: string[] }): Promise<NostrEvent[]>;
  close(): Promise<void>;
}

export interface EventClientOpts {
  relays?: string[];
  timeoutMs?: number;
  createPool?: () => EventPool;
}

/** One short-lived pool per lookup; relay hints get a bounded first attempt. */
export class EventClient {
  private opts: EventClientOpts;

  constructor(opts: EventClientOpts = {}) {
    this.opts = opts;
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
      await pool.close();
    }
  }
}
