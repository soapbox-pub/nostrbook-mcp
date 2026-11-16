import { HTTPError } from './HTTPError.ts';
import { llmstxtUrl } from './llmstxt.ts';

/** Options for configuring the NostrbookClient */
export interface NostrbookClientOpts {
  /** Base URL of the Nostrbook service */
  baseUrl: URL | string;
  /** Optional fetch function override */
  fetch?: typeof fetch;
  timeoutMs?: number;
}

/** Client for interacting with Nostrbook documentation */
export class NostrbookClient {
  /** Base URL of the Nostrbook service */
  readonly baseUrl: URL;

  /** The fetch implementation to use for requests */
  private fetch: typeof fetch;
  private timeoutMs: number;

  constructor(opts: NostrbookClientOpts) {
    this.baseUrl = new URL(opts.baseUrl);
    this.fetch = opts.fetch ?? globalThis.fetch;
    this.timeoutMs = opts.timeoutMs ?? 10_000;
  }

  /** Fetches content from a specific path on the Nostrbook service */
  async get(path: string): Promise<string> {
    const url = llmstxtUrl(new URL(path, this.baseUrl));

    const request = new Request(url, { signal: AbortSignal.timeout(this.timeoutMs) });
    const response = await this.fetch(request);

    if (!response.ok) {
      throw new HTTPError(response, request);
    }

    return response.text();
  }

  /** Reads documentation for a specific Nostr event kind */
  readKind(kind: number): Promise<string> {
    return this.get(`/kinds/${kind}`);
  }

  /** Reads documentation for a specific Nostr tag */
  readTag(tag: string): Promise<string> {
    return this.get(`/tags/${encodeURIComponent(tag)}`);
  }

  /** Reads documentation for a specific Nostr protocol document */
  readProtocol(doc: string): Promise<string> {
    return this.get(`/protocol/${doc}`);
  }
}
