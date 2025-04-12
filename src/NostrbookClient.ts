import { llmstxtUrl } from "./llmstxt.ts";

export interface NostrbookClientOpts {
  baseUrl: URL | string;
  fetch?: typeof fetch;
}

export class NostrbookClient {
  readonly baseUrl: URL;

  private fetch: typeof fetch;

  constructor(opts: NostrbookClientOpts) {
    this.baseUrl = new URL(opts.baseUrl);
    this.fetch = opts.fetch ?? globalThis.fetch;
  }

  async get(path: string): Promise<string> {
    const url = llmstxtUrl(new URL(path, this.baseUrl));

    const request = new Request(url);
    const response = await this.fetch(request);

    if (!response.ok) {
      throw new HTTPError(response, request);
    }

    return response.text();
  }

  readKind(kind: number): Promise<string> {
    return this.get(`/kinds/${kind}`);
  }

  readTag(tag: string): Promise<string> {
    return this.get(`/tags/${tag}`);
  }

  readProtocol(slug: string): Promise<string> {
    return this.get(`/protocol/${slug}`);
  }
}

export class HTTPError extends Error {
  constructor(readonly response: Response, readonly request: Request) {
    super(`HTTP Error: ${response.status} ${request.method} ${request.url}`);
    this.name = "HTTPError";
  }
}
